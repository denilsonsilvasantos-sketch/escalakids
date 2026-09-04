import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_USERS,
  INITIAL_MICROS,
  INITIAL_FUNCTIONS,
  INITIAL_FAMILIES,
  INITIAL_PEOPLE,
  INITIAL_AVAILABILITIES,
  INITIAL_SCHEDULES,
  INITIAL_ROTATION_HISTORY,
  INITIAL_AUDIT_LOGS
} from './src/data/seedData';

interface MevamDatabase {
  users: any[];
  micros: any[];
  functions: any[];
  families: any[];
  people: any[];
  availabilities: any[];
  schedules: any[];
  rotationHistory: any[];
  auditLogs: any[];
  supabaseConfig: {
    url: string;
  };
  version: number;
  lastUpdated: string;
}

// --- Server-only secrets. Never prefix these with VITE_ (that would bundle them into the client). ---
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_BOOTSTRAP_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL || '';
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

let memoryDb: MevamDatabase | null = null;

// --- Session store (in-memory: server restart requires re-login, which is an acceptable trade-off for this app's scale) ---
interface Session {
  userId: string;
  role: string;
  expiresAt: number;
}
const sessions = new Map<string, Session>();

function createSession(userId: string, role: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId, role, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token: string | null): Session | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

// Periodically sweep expired sessions so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}, 60 * 60 * 1000);

// --- Basic login rate limiting (per normalized login identifier) ---
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; firstAttemptAt: number; lockedUntil?: number }>();

function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }
  if (now - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }
  entry.count += 1;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }
}

function clearLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

// Strips the password hash from a user object before it ever leaves the server.
function sanitizeUser(u: any) {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}

function sanitizeDbForClient(db: MevamDatabase) {
  return {
    ...db,
    users: (db.users || []).map(sanitizeUser)
  };
}

function isBcryptHash(value: unknown): value is string {
  return typeof value === 'string' && /^\$2[aby]?\$/.test(value);
}

async function bootstrapAdminUser(): Promise<any> {
  const email = ADMIN_BOOTSTRAP_EMAIL || undefined;
  let plainPassword = ADMIN_BOOTSTRAP_PASSWORD;
  let generated = false;
  if (!plainPassword) {
    plainPassword = crypto.randomBytes(9).toString('base64url');
    generated = true;
  }
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  if (generated) {
    console.log('==================================================================');
    console.log('MEVAM Kids: nenhuma senha de administrador foi configurada via env.');
    console.log('Uma senha inicial foi gerada automaticamente para o usuário "admin":');
    console.log(`  Usuário: admin`);
    console.log(`  Senha:   ${plainPassword}`);
    console.log('Guarde esta senha agora e troque-a no primeiro acesso.');
    console.log('Para definir a senha manualmente, configure ADMIN_BOOTSTRAP_PASSWORD no .env.local.');
    console.log('==================================================================');
  }

  return {
    id: 'user-admin',
    name: 'Administrador',
    username: 'admin',
    email,
    password: passwordHash,
    role: 'ADMIN_LIDERANCA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    allowedMicroIds: [],
    primaryMicroId: null,
    whatsapp: '',
    createdByName: 'Sistema MEVAM Kids',
    mustChangePassword: !ADMIN_BOOTSTRAP_PASSWORD,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function getDb(): Promise<MevamDatabase> {
  if (memoryDb) return memoryDb;

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data dir:', e);
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    const admin = await bootstrapAdminUser();
    const initial: MevamDatabase = {
      users: [admin],
      micros: INITIAL_MICROS,
      functions: INITIAL_FUNCTIONS,
      families: INITIAL_FAMILIES,
      people: INITIAL_PEOPLE,
      availabilities: INITIAL_AVAILABILITIES,
      schedules: INITIAL_SCHEDULES,
      rotationHistory: INITIAL_ROTATION_HISTORY,
      auditLogs: INITIAL_AUDIT_LOGS,
      supabaseConfig: { url: SUPABASE_URL },
      version: 1,
      lastUpdated: new Date().toISOString()
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write initial db:', e);
    }
    memoryDb = initial;
    return initial;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    memoryDb = JSON.parse(content);
    return memoryDb!;
  } catch (err) {
    console.error('Failed to read db file:', err);
    const admin = await bootstrapAdminUser();
    memoryDb = {
      users: [admin],
      micros: INITIAL_MICROS,
      functions: INITIAL_FUNCTIONS,
      families: [],
      people: [],
      availabilities: [],
      schedules: [],
      rotationHistory: [],
      auditLogs: [],
      supabaseConfig: { url: SUPABASE_URL },
      version: 1,
      lastUpdated: new Date().toISOString()
    };
    return memoryDb;
  }
}

function saveDb(updated: MevamDatabase): void {
  updated.version = (updated.version || 0) + 1;
  updated.lastUpdated = new Date().toISOString();
  memoryDb = updated;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db file:', err);
  }
}

// The client-side RBAC rules (who can create/edit which users) live in
// storageService.ts, but nothing enforced them here: since /api/data accepts a
// whole `users` array, a crafted request from any authenticated non-admin
// session could otherwise grant itself (or a new account) ADMIN_LIDERANCA.
// This filters the incoming array down to only the changes that session is
// actually allowed to make, silently dropping the rest (never rejecting the
// whole sync — a stale/offline client's payload should still merge safely for
// the parts it IS allowed to touch, e.g. its own name/whatsapp/password).
function authorizeUsersPayload(incomingUsers: any[] | undefined, currentUsers: any[], session: Session): any[] {
  if (!Array.isArray(incomingUsers)) return currentUsers;
  if (session.role === 'ADMIN_LIDERANCA') return incomingUsers;

  const currentById = new Map(currentUsers.map((u) => [u.id, u]));
  const incomingById = new Map(incomingUsers.map((u) => [u.id, u]));
  const authorized: any[] = [];

  for (const existing of currentUsers) {
    const incoming = incomingById.get(existing.id);
    if (!incoming) {
      // Non-admins can never delete a user via bulk sync; keep the server's copy.
      authorized.push(existing);
      continue;
    }
    const canEdit = incoming.id === session.userId || existing.createdBy === session.userId;
    if (!canEdit) {
      authorized.push(existing);
      continue;
    }
    // Editing is allowed, but never let role/id/createdBy be changed this way.
    authorized.push({ ...existing, ...incoming, id: existing.id, role: existing.role, createdBy: existing.createdBy });
  }

  for (const incoming of incomingUsers) {
    if (currentById.has(incoming.id)) continue; // already handled above
    // New account creation: only a LIDER_MACRO creating a LIDER_MICRO is allowed,
    // mirroring createDelegatedUser()'s rule in storageService.ts.
    if (session.role === 'LIDER_MACRO' && incoming.role === 'LIDER_MICRO') {
      authorized.push(incoming);
    }
    // Anything else (a non-macro-leader trying to create any account, or a
    // macro leader trying to create anything other than a micro leader) is
    // silently dropped rather than applied.
  }

  return authorized;
}

// Merges an incoming users array without ever losing a stored password hash:
// the client never receives password hashes back (see sanitizeUser), so any
// user record it echoes back has no `password` field unless it just set one.
function mergeUsers(incomingUsers: any[] | undefined, currentUsers: any[]): any[] {
  if (!Array.isArray(incomingUsers)) return currentUsers;
  const currentById = new Map(currentUsers.map((u) => [u.id, u]));
  return incomingUsers.map((incoming) => {
    const existing = currentById.get(incoming.id);
    const password = incoming.password || existing?.password;
    return { ...existing, ...incoming, password };
  });
}

function getServiceSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

let backendSupabaseSyncTimer: NodeJS.Timeout | null = null;

async function syncToSupabaseFromBackend(db: MevamDatabase): Promise<{ success: boolean; message?: string }> {
  const client = getServiceSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase não configurado no servidor (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes).' };
  }

  try {
    // 1. Profiles
    const validUsers = db.users || [];
    const keepUserIds = validUsers.map((u: any) => u.id);
    if (keepUserIds.length > 0) {
      try {
        const { data: existingProfiles } = await client.from('profiles').select('id');
        const toDeleteProfiles = (existingProfiles || []).map((p: any) => p.id).filter((id: string) => !keepUserIds.includes(id));
        if (toDeleteProfiles.length > 0) {
          await client.from('profiles').delete().in('id', toDeleteProfiles);
        }
      } catch {
        // ignore
      }

      const userPayload = validUsers.map((u: any) => ({
        id: u.id,
        name: u.name,
        username: u.username || null,
        email: u.email || null,
        password: u.password || null,
        role: u.role,
        avatar: u.avatar || null,
        allowed_micro_ids: u.allowedMicroIds || [],
        primary_micro_id: u.primaryMicroId || null,
        person_id: u.personId || null,
        whatsapp: u.whatsapp || null,
        created_by: u.createdBy || null,
        created_by_name: u.createdByName || null,
        must_change_password: u.mustChangePassword ?? false,
        last_login_at: u.lastLoginAt || null,
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: u.updatedAt || new Date().toISOString()
      }));
      await client.from('profiles').upsert(userPayload, { onConflict: 'id' });
    }

    // 2. Micros
    const keepMicroIds = (db.micros || []).map((m: any) => m.id);
    if (keepMicroIds.length > 0) {
      try {
        const { data: existingMicros } = await client.from('micros').select('id');
        const toDeleteMicros = (existingMicros || []).map((m: any) => m.id).filter((id: string) => !keepMicroIds.includes(id));
        if (toDeleteMicros.length > 0) {
          await client.from('micros').delete().in('id', toDeleteMicros);
        }
      } catch {
        // ignore
      }

      const microPayload = db.micros.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description || null,
        leader_name: m.leaderName || null,
        leader_id: m.leaderId || null,
        status: m.status,
        color: m.color,
        icon_name: m.iconName || 'Layers',
        default_shifts: m.defaultShifts || ['Manhã', 'Noite'],
        algorithm_weights: m.algorithmWeights || {},
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString()
      }));
      await client.from('micros').upsert(microPayload, { onConflict: 'id' });
    } else {
      try {
        await client.from('micro_functions').delete().neq('id', 'none');
        await client.from('micros').delete().neq('id', 'none');
      } catch {
        // ignore
      }
    }

    // 3. Micro Functions
    const keepFnIds = (db.functions || []).map((f: any) => f.id);
    if (keepFnIds.length > 0 && keepMicroIds.length > 0) {
      try {
        const { data: existingFns } = await client.from('micro_functions').select('id');
        const toDeleteFns = (existingFns || []).map((f: any) => f.id).filter((id: string) => !keepFnIds.includes(id));
        if (toDeleteFns.length > 0) {
          await client.from('micro_functions').delete().in('id', toDeleteFns);
        }
      } catch {
        // ignore
      }

      const microIdSet = new Set(keepMicroIds);
      const validFns = db.functions.filter((f: any) => microIdSet.has(f.microId));
      if (validFns.length > 0) {
        const fnPayload = validFns.map((f: any) => ({
          id: f.id,
          micro_id: f.microId,
          name: f.name,
          description: f.description || null,
          category: f.category || null,
          criteria: f.criteria || {},
          default_required_count: f.defaultRequiredCount || 1,
          created_at: f.createdAt || new Date().toISOString(),
          updated_at: f.updatedAt || new Date().toISOString()
        }));
        await client.from('micro_functions').upsert(fnPayload, { onConflict: 'id' });
      }
    } else {
      try {
        await client.from('micro_functions').delete().neq('id', 'none');
      } catch {
        // ignore
      }
    }

    // 4. Families
    const keepFamilyIds = (db.families || []).map((f: any) => f.id);
    if (keepFamilyIds.length > 0) {
      try {
        const { data: existingFamilies } = await client.from('families').select('id');
        const toDeleteFamilies = (existingFamilies || []).map((f: any) => f.id).filter((id: string) => !keepFamilyIds.includes(id));
        if (toDeleteFamilies.length > 0) {
          await client.from('families').delete().in('id', toDeleteFamilies);
        }
      } catch {
        // ignore
      }

      const familyPayload = db.families.map((f: any) => ({
        id: f.id,
        name: f.name,
        priority: f.priority,
        notes: f.notes || null,
        created_at: f.createdAt || new Date().toISOString(),
        updated_at: f.updatedAt || new Date().toISOString()
      }));
      await client.from('families').upsert(familyPayload, { onConflict: 'id' });
    } else {
      try {
        await client.from('families').delete().neq('id', 'none');
      } catch {
        // ignore
      }
    }

    // 5. People
    const keepPeopleIds = (db.people || []).map((p: any) => p.id);
    if (keepPeopleIds.length > 0) {
      try {
        const { data: existingPeople } = await client.from('people').select('id');
        const toDeletePeople = (existingPeople || []).map((p: any) => p.id).filter((id: string) => !keepPeopleIds.includes(id));
        if (toDeletePeople.length > 0) {
          await client.from('people').delete().in('id', toDeletePeople);
        }
      } catch {
        // ignore
      }

      const familyIdSet = new Set(keepFamilyIds);
      const peoplePayload = db.people.map((p: any) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname || null,
        birth_date: p.birthDate,
        phone: p.phone,
        whatsapp: p.whatsapp,
        email: p.email || null,
        avatar_url: p.avatarUrl || null,
        notes: p.notes || null,
        family_id: (p.familyId && familyIdSet.has(p.familyId)) ? p.familyId : null,
        active: p.active,
        micro_ids: p.microIds || [],
        function_preferences: p.functionPreferences || [],
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: p.updatedAt || new Date().toISOString()
      }));
      let { error } = await client.from('people').upsert(peoplePayload, { onConflict: 'id' });
      if (error && error.code === '23503') {
        const safePayload = peoplePayload.map((p: any) => ({ ...p, family_id: null }));
        await client.from('people').upsert(safePayload, { onConflict: 'id' });
      }
    } else {
      try {
        await client.from('availability_rules').delete().neq('id', 'none');
        await client.from('people').delete().neq('id', 'none');
      } catch {
        // ignore
      }
    }

    // 6. Availabilities
    if (db.availabilities && db.availabilities.length > 0 && db.people && db.people.length > 0) {
      const personIdSet = new Set(db.people.map((p: any) => p.id));
      const validAvail = db.availabilities.filter((a: any) => personIdSet.has(a.personId));
      if (validAvail.length > 0) {
        const availPayload = validAvail.map((a: any) => ({
          id: a.id,
          person_id: a.personId,
          type: a.type === 'DATA_ESPECIFICA' ? 'DATA_ESPECIFICA' : 'RECORRENTE',
          day_of_week: a.dayOfWeek ?? null,
          shift: a.shift || null,
          specific_date: a.specificDate || null,
          is_available: a.isAvailable,
          reason: a.reason || null,
          created_at: a.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        await client.from('availability_rules').upsert(availPayload, { onConflict: 'id' });
      }
    }

    // 7. Schedules
    if (db.schedules && db.schedules.length > 0) {
      const schedPayload = db.schedules.map((s: any) => ({
        id: s.id,
        title: s.title,
        event_id: s.eventId || null,
        event_name: s.eventName,
        period: s.period || null,
        shift: s.shift === 'MANHA' ? 'MANHA' : s.shift === 'NOITE' ? 'NOITE' : 'AMBOS',
        dates: s.dates || [],
        micro_ids: s.microIds || [],
        status: s.status,
        quality_metrics: s.qualityMetrics || {},
        slots: s.slots || [],
        created_at: s.createdAt || new Date().toISOString(),
        updated_at: s.updatedAt || new Date().toISOString()
      }));
      await client.from('schedules').upsert(schedPayload, { onConflict: 'id' });
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Backend Supabase sync error:', err?.message || err);
    return { success: false, message: err?.message };
  }
}

function scheduleBackendSupabaseSync(db: MevamDatabase) {
  if (backendSupabaseSyncTimer) {
    clearTimeout(backendSupabaseSyncTimer);
  }
  backendSupabaseSyncTimer = setTimeout(() => {
    syncToSupabaseFromBackend(db).catch((e) => console.warn('Delayed Supabase sync failed:', e));
  }, 1500);
}

async function syncFromSupabaseToBackend(): Promise<void> {
  const client = getServiceSupabaseClient();
  if (!client) return;

  try {
    const [microsRes, fnsRes, profilesRes] = await Promise.all([
      client.from('micros').select('*'),
      client.from('micro_functions').select('*'),
      client.from('profiles').select('*')
    ]);

    const db = await getDb();
    let changed = false;

    if (microsRes.data && microsRes.data.length > 0) {
      db.micros = microsRes.data.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        leaderName: m.leader_name || '',
        leaderId: m.leader_id || null,
        status: m.status || 'ATIVO',
        color: m.color || '#3b82f6',
        iconName: m.icon_name || 'Layers',
        defaultShifts: m.default_shifts || ['Manhã', 'Noite'],
        algorithmWeights: m.algorithm_weights || {},
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));
      changed = true;
    }

    if (fnsRes.data && fnsRes.data.length > 0) {
      db.functions = fnsRes.data.map((f: any) => ({
        id: f.id,
        microId: f.micro_id,
        name: f.name,
        description: f.description || '',
        category: f.category || 'Geral',
        defaultRequiredCount: f.default_required_count || 1,
        criteria: f.criteria || {},
        createdAt: f.created_at,
        updatedAt: f.updated_at
      }));
      changed = true;
    }

    if (profilesRes.data && profilesRes.data.length > 0) {
      db.users = mergeUsers(
        profilesRes.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          password: isBcryptHash(u.password) ? u.password : undefined,
          role: u.role,
          avatar: u.avatar,
          allowedMicroIds: u.allowed_micro_ids || [],
          primaryMicroId: u.primary_micro_id,
          whatsapp: u.whatsapp,
          createdByName: u.created_by_name,
          mustChangePassword: u.must_change_password ?? false,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        })),
        db.users
      );
      changed = true;
    }

    if (changed) {
      db.version = (db.version || 0) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDb(db);
      console.log('Central server synced from Supabase cloud on boot.');
    }
  } catch (err) {
    console.warn('Startup sync from Supabase skipped:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  function getBearerToken(req: express.Request): string | null {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }

  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const session = getSession(getBearerToken(req));
    if (!session) {
      res.status(401).json({ success: false, message: 'Sessão inválida ou expirada. Faça login novamente.' });
      return;
    }
    (req as any).authSession = session;
    next();
  }

  function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const session = (req as any).authSession as Session | undefined;
    if (!session || session.role !== 'ADMIN_LIDERANCA') {
      res.status(403).json({ success: false, message: 'Apenas o Administrador pode executar esta ação.' });
      return;
    }
    next();
  }

  // API: Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Login (server-side credential check, issues a session token)
  app.post('/api/login', async (req, res) => {
    const { login, password } = req.body || {};
    const cleanId = String(login || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanId || !cleanPass) {
      res.status(400).json({ success: false, message: 'Informe usuário e senha.' });
      return;
    }

    const rate = checkLoginRateLimit(cleanId);
    if (!rate.allowed) {
      const minutes = Math.ceil((rate.retryAfterMs || 0) / 60000);
      res.status(429).json({ success: false, message: `Muitas tentativas. Tente novamente em ${minutes} minuto(s).` });
      return;
    }

    const db = await getDb();
    const users = db.users || [];

    let user = users.find((u: any) => {
      if (cleanId === 'admin' || cleanId === 'administrador') {
        return u.role === 'ADMIN_LIDERANCA' || u.id === 'user-admin' || u.username === 'admin';
      }
      const matchUsername = u.username && u.username.toLowerCase() === cleanId;
      const matchId = u.id.toLowerCase() === cleanId;
      const normalizedName = (u.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const matchFirstName = normalizedName.split(' ')[0] === cleanId;
      return matchUsername || matchId || matchFirstName;
    });

    if (!user) {
      recordLoginFailure(cleanId);
      res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
      return;
    }

    if (user.role === 'VOLUNTARIO') {
      res.status(403).json({ success: false, message: 'O acesso ao painel é exclusivo para a Liderança.' });
      return;
    }

    let passwordOk = false;
    if (isBcryptHash(user.password)) {
      passwordOk = await bcrypt.compare(cleanPass, user.password);
    } else if (user.password) {
      // Legacy plaintext password from before hashing was introduced: verify once, then migrate transparently.
      passwordOk = cleanPass === user.password;
      if (passwordOk) {
        user.password = await bcrypt.hash(cleanPass, 10);
        saveDb(db);
      }
    }

    if (!passwordOk) {
      recordLoginFailure(cleanId);
      res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
      return;
    }

    clearLoginFailures(cleanId);
    user.lastLoginAt = new Date().toISOString();
    saveDb(db);

    const token = createSession(user.id, user.role);
    res.json({ success: true, token, user: sanitizeUser(user) });
  });

  // API: Logout (invalidate session token)
  app.post('/api/logout', (req, res) => {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    res.json({ success: true });
  });

  // API: Current session's user
  app.get('/api/me', requireAuth, async (req, res) => {
    const session = (req as any).authSession as Session;
    const db = await getDb();
    const user = (db.users || []).find((u: any) => u.id === session.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }
    res.json({ success: true, user: sanitizeUser(user) });
  });

  // API: Version check for lightweight cross-device polling
  app.get('/api/version', requireAuth, async (_req, res) => {
    const db = await getDb();
    res.json({ version: db.version, lastUpdated: db.lastUpdated });
  });

  // API: Get complete unified database (shared across all devices) - password hashes are never sent to clients
  app.get('/api/data', requireAuth, async (_req, res) => {
    const db = await getDb();
    res.json({ success: true, data: sanitizeDbForClient(db) });
  });

  // API: Sync/Save data from any client device to the central server
  app.post('/api/data', requireAuth, async (req, res) => {
    const incoming = req.body || {};
    const db = await getDb();
    const session = (req as any).authSession as Session;

    const merged: MevamDatabase = {
      ...db,
      users: mergeUsers(authorizeUsersPayload(incoming.users, db.users, session), db.users),
      micros: incoming.micros || db.micros,
      functions: incoming.functions || db.functions,
      families: incoming.families || db.families,
      people: incoming.people || db.people,
      availabilities: incoming.availabilities || db.availabilities,
      schedules: incoming.schedules || db.schedules,
      rotationHistory: incoming.rotationHistory || db.rotationHistory,
      auditLogs: incoming.auditLogs || db.auditLogs,
      supabaseConfig: db.supabaseConfig
    };

    saveDb(merged);
    scheduleBackendSupabaseSync(merged);

    res.json({ success: true, version: merged.version, lastUpdated: merged.lastUpdated });
  });

  // API: Trigger immediate Supabase sync (push local -> cloud). Admin only.
  app.post('/api/supabase/sync', requireAuth, requireAdmin, async (_req, res) => {
    const db = await getDb();
    const result = await syncToSupabaseFromBackend(db);
    res.json(result);
  });

  // API: Trigger immediate Supabase pull (cloud -> local). Admin only.
  app.post('/api/supabase/pull', requireAuth, requireAdmin, async (_req, res) => {
    await syncFromSupabaseToBackend();
    const db = await getDb();
    res.json({ success: true, data: sanitizeDbForClient(db) });
  });

  // API: Get active Supabase configuration status (no keys are ever exposed to the client)
  app.get('/api/config/supabase', requireAuth, async (_req, res) => {
    res.json({
      isConfigured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    });
  });

  // API: Reset server database to initial clean state. Admin only. Preserves the current admin's credentials.
  app.post('/api/reset', requireAuth, requireAdmin, async (_req, res) => {
    const currentDb = await getDb();
    const currentAdmin = (currentDb.users || []).find((u: any) => u.id === 'user-admin') || (await bootstrapAdminUser());

    const cleanDb: MevamDatabase = {
      users: [currentAdmin],
      micros: [],
      functions: [],
      families: [],
      people: [],
      availabilities: [],
      schedules: [],
      rotationHistory: [],
      auditLogs: [],
      supabaseConfig: currentDb.supabaseConfig || { url: SUPABASE_URL },
      version: Date.now(),
      lastUpdated: new Date().toISOString()
    };
    saveDb(cleanDb);

    const client = getServiceSupabaseClient();
    if (client) {
      try {
        await client.from('audit_logs').delete().neq('id', 'none');
        await client.from('rotation_history').delete().neq('id', 'none');
        await client.from('schedules').delete().neq('id', 'none');
        await client.from('availability_rules').delete().neq('id', 'none');
        await client.from('people').delete().neq('id', 'none');
        await client.from('families').delete().neq('id', 'none');
        await client.from('micro_functions').delete().neq('id', 'none');
        await client.from('micros').delete().neq('id', 'none');
        await client.from('profiles').delete().neq('id', 'user-admin');
        await client.from('profiles').upsert(
          {
            id: currentAdmin.id,
            name: currentAdmin.name,
            username: currentAdmin.username,
            email: currentAdmin.email || null,
            password: currentAdmin.password,
            role: currentAdmin.role,
            avatar: currentAdmin.avatar || null,
            allowed_micro_ids: [],
            primary_micro_id: null,
            whatsapp: currentAdmin.whatsapp || null,
            must_change_password: currentAdmin.mustChangePassword ?? false,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
      } catch (e) {
        console.warn('Error resetting Supabase tables:', e);
      }
    }

    res.json({ success: true, message: 'Banco de dados resetado com sucesso! Suas credenciais de administrador foram mantidas.' });
  });

  // Vite middleware for development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Initial cloud sync on startup to guarantee database.json matches Supabase
  syncFromSupabaseToBackend().catch((e) => console.warn('Initial cloud sync error:', e));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MEVAM Kids Server running on http://0.0.0.0:${PORT}`);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Aviso: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados — sincronização em nuvem desativada (dados ficam apenas no servidor local).');
    }
  });
}

startServer();
