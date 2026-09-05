import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
} from '../src/data/seedData';

// This module holds every /api/* route and all the shared server-side state
// (the local JSON "database", session signing, Supabase sync). It is imported
// by two different entry points:
//   - ../server.ts: a traditional long-running process (local dev, or any host
//     that runs `npm start` as a persistent container — e.g. the AI Studio
//     hosting this app also runs on).
//   - ../api/index.ts: a Vercel serverless function. Vercel gives each request
//     a short-lived, isolated instance with NO shared memory and a read-only
//     filesystem outside /tmp, so anything that assumes a persistent local
//     file or an in-memory cache surviving between requests silently breaks
//     there. Keeping all of that logic in one place, behind ensureInitialSync()
//     and getDb()/saveDb(), means both entry points get the same fixes.

export interface MevamDatabase {
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

// Serverless hosts (Vercel and similar) run each request on its own short-lived
// instance with no shared memory and no persistent disk — an in-memory session
// Map only works as long as the same process handles every request, which is
// never guaranteed there. SESSION_SECRET makes sessions stateless (signed
// tokens, verified without any server-side lookup) so login works no matter
// which instance handles which request. Set this explicitly in production;
// without it every cold start gets its own random secret and invalidates
// every token issued by any other instance, causing exactly the "login
// succeeds then immediately bounces back out" symptom.
let SESSION_SECRET = process.env.SESSION_SECRET || '';
if (!SESSION_SECRET) {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('==================================================================');
  console.warn('AVISO: SESSION_SECRET não configurado. Um valor temporário foi');
  console.warn('gerado só para este processo. Em ambientes serverless (Vercel e');
  console.warn('similares), isso faz o login falhar de forma intermitente, pois');
  console.warn('cada instância do servidor terá um segredo diferente.');
  console.warn('Configure SESSION_SECRET (qualquer string longa e aleatória) nas');
  console.warn('variáveis de ambiente para resolver definitivamente.');
  console.warn('==================================================================');
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

let memoryDb: MevamDatabase | null = null;

// --- Stateless sessions: a signed token carries its own payload, so any
// instance can verify it without needing to share memory with whichever
// instance issued it. There is no server-side revocation list, so logout is
// client-side only (the token stays cryptographically valid until it expires,
// up to SESSION_TTL_MS) — an accepted trade-off for this app's scale.
export interface Session {
  userId: string;
  role: string;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function signToken(payload: Session & { exp: number }): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function createSession(userId: string, role: string): string {
  return signToken({ userId, role, exp: Date.now() + SESSION_TTL_MS });
}

function getSession(token: string | null): Session | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

// --- Basic login rate limiting (per normalized login identifier). Note: like
// the old session Map, this only works per-instance — on a serverless host it
// resets on every cold start and isn't shared across concurrent instances.
// It's still worthwhile defense-in-depth, just not a hard guarantee there. ---
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

// Best-effort local cache. On a persistent host (traditional server.ts) this
// really does persist across restarts. On Vercel's serverless functions the
// filesystem outside /tmp is read-only, so every write below silently fails
// (caught, logged, ignored) and every cold start starts from scratch here —
// which is exactly why ensureInitialSync() below re-pulls everything from
// Supabase before any request is served: Supabase, not this file, is the
// actual source of truth whenever SUPABASE_SERVICE_ROLE_KEY is configured.
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
    // Expected on serverless hosts with a read-only filesystem — Supabase is
    // the durable copy there, see the note on getDb() above.
    console.error('Failed to write db file (expected on serverless hosts):', err);
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

// Pulls everything Supabase has into the in-memory db. This is the ONLY
// reliable source of truth on a serverless host (see getDb()'s comment), so
// it now covers every collection that syncToSupabaseFromBackend() pushes —
// previously this only pulled micros/functions/profiles back, which silently
// lost people/families/schedules/availability on every Vercel cold start.
async function syncFromSupabaseToBackend(): Promise<void> {
  const client = getServiceSupabaseClient();
  if (!client) return;

  try {
    const [microsRes, fnsRes, profilesRes, familiesRes, peopleRes, availRes, schedRes] = await Promise.all([
      client.from('micros').select('*'),
      client.from('micro_functions').select('*'),
      client.from('profiles').select('*'),
      client.from('families').select('*'),
      client.from('people').select('*'),
      client.from('availability_rules').select('*'),
      client.from('schedules').select('*')
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
          personId: u.person_id || undefined,
          whatsapp: u.whatsapp,
          createdBy: u.created_by || undefined,
          createdByName: u.created_by_name,
          mustChangePassword: u.must_change_password ?? false,
          lastLoginAt: u.last_login_at || undefined,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        })),
        db.users
      );
      changed = true;
    }

    if (familiesRes.data && familiesRes.data.length > 0) {
      db.families = familiesRes.data.map((f: any) => ({
        id: f.id,
        name: f.name,
        priority: f.priority,
        notes: f.notes || undefined,
        createdAt: f.created_at,
        updatedAt: f.updated_at
      }));
      changed = true;
    }

    if (peopleRes.data && peopleRes.data.length > 0) {
      db.people = peopleRes.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        nickname: p.nickname || undefined,
        birthDate: p.birth_date,
        phone: p.phone,
        whatsapp: p.whatsapp,
        email: p.email || undefined,
        avatarUrl: p.avatar_url || undefined,
        notes: p.notes || undefined,
        familyId: p.family_id || undefined,
        active: p.active,
        microIds: p.micro_ids || [],
        functionPreferences: p.function_preferences || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
      changed = true;
    }

    if (availRes.data && availRes.data.length > 0) {
      db.availabilities = availRes.data.map((a: any) => ({
        id: a.id,
        personId: a.person_id,
        type: a.type === 'DATA_ESPECIFICA' ? 'DATA_ESPECIFICA' : 'RECORRENTE',
        dayOfWeek: a.day_of_week ?? undefined,
        shift: a.shift || undefined,
        specificDate: a.specific_date || undefined,
        isAvailable: a.is_available,
        reason: a.reason || undefined,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
      changed = true;
    }

    if (schedRes.data && schedRes.data.length > 0) {
      db.schedules = schedRes.data.map((s: any) => ({
        id: s.id,
        title: s.title,
        eventId: s.event_id || undefined,
        eventName: s.event_name,
        period: s.period || undefined,
        shift: s.shift,
        dates: s.dates || [],
        microIds: s.micro_ids || [],
        status: s.status,
        qualityMetrics: s.quality_metrics || {},
        slots: s.slots || [],
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));
      changed = true;
    }

    if (changed) {
      db.version = (db.version || 0) + 1;
      db.lastUpdated = new Date().toISOString();
      saveDb(db);
      console.log('Central server synced from Supabase cloud.');
    }
  } catch (err) {
    console.warn('Sync from Supabase skipped:', err);
  }
}

// Runs the Supabase pull exactly once per process — once at boot on a
// persistent server, once per cold start on a serverless one — and lets every
// concurrent/subsequent caller await that same run instead of triggering it
// again. This is what guarantees a request is never served against a
// freshly-bootstrapped, not-yet-synced in-memory db.
let initialSyncPromise: Promise<void> | null = null;
export function ensureInitialSync(): Promise<void> {
  if (!initialSyncPromise) {
    initialSyncPromise = syncFromSupabaseToBackend().catch((e) => {
      console.warn('Initial cloud sync error:', e);
    });
  }
  return initialSyncPromise;
}

export function isCloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

// Express 4 does not forward a rejected promise from an async route handler to
// its error-handling middleware on its own — an unhandled rejection just hangs
// or bubbles up as an unhandled rejection at the process level. On a normal
// long-running server that's a logged warning; on a serverless host (Vercel)
// an unhandled rejection can take the whole function invocation down with it
// (FUNCTION_INVOCATION_FAILED), turning a single failed Supabase call or a
// missing field into a total outage instead of a JSON error response. Wrapping
// every async handler below guarantees errors always reach `next(err)`.
function asyncHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApiRouter(): express.Router {
  const router = express.Router();

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

  // API: Health check. Deliberately registered before the Supabase-sync-wait
  // middleware below, so it stays a true liveness probe that never depends on
  // Supabase (or anything else) being reachable/configured.
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Every other request waits for the (memoized) initial Supabase pull to
  // finish before touching the db — critical on serverless, where "initial"
  // really means "once per cold start", not "once ever".
  router.use(
    asyncHandler(async (_req, _res, next) => {
      await ensureInitialSync();
      next();
    })
  );

  // API: Login (server-side credential check, issues a session token)
  router.post('/login', asyncHandler(async (req, res) => {
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
      const normalizedName = (u.name || '').toLowerCase().normalize('NFD').replace(new RegExp('[̀-ͯ]', 'g'), '');
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
    await syncToSupabaseFromBackend(db);

    const token = createSession(user.id, user.role);
    res.json({ success: true, token, user: sanitizeUser(user) });
  }));

  // API: Logout. Sessions are stateless signed tokens (see createSession/getSession
  // above), so there is nothing to delete server-side — the client just discards
  // its copy of the token. This endpoint exists for API symmetry / future use.
  router.post('/logout', (_req, res) => {
    res.json({ success: true });
  });

  // API: Current session's user
  router.get('/me', requireAuth, asyncHandler(async (req, res) => {
    const session = (req as any).authSession as Session;
    const db = await getDb();
    const user = (db.users || []).find((u: any) => u.id === session.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'Usuário não encontrado.' });
      return;
    }
    res.json({ success: true, user: sanitizeUser(user) });
  }));

  // API: Version check for lightweight cross-device polling
  router.get('/version', requireAuth, asyncHandler(async (_req, res) => {
    const db = await getDb();
    res.json({ version: db.version, lastUpdated: db.lastUpdated });
  }));

  // API: Get complete unified database (shared across all devices) - password hashes are never sent to clients
  router.get('/data', requireAuth, asyncHandler(async (_req, res) => {
    const db = await getDb();
    res.json({ success: true, data: sanitizeDbForClient(db) });
  }));

  // API: Sync/Save data from any client device to the central server.
  // Pushes to Supabase are awaited (not just scheduled) before responding:
  // on a serverless host, a deferred timer can simply never fire once the
  // function instance is frozen/recycled right after the response is sent.
  router.post('/data', requireAuth, asyncHandler(async (req, res) => {
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
    await syncToSupabaseFromBackend(merged);

    res.json({ success: true, version: merged.version, lastUpdated: merged.lastUpdated });
  }));

  // API: Trigger immediate Supabase sync (push local -> cloud). Admin only.
  router.post('/supabase/sync', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    const db = await getDb();
    const result = await syncToSupabaseFromBackend(db);
    res.json(result);
  }));

  // API: Trigger immediate Supabase pull (cloud -> local). Admin only.
  router.post('/supabase/pull', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
    await syncFromSupabaseToBackend();
    const db = await getDb();
    res.json({ success: true, data: sanitizeDbForClient(db) });
  }));

  // API: Get active Supabase configuration status (no keys are ever exposed to the client)
  router.get('/config/supabase', requireAuth, asyncHandler(async (_req, res) => {
    res.json({ isConfigured: isCloudConfigured() });
  }));

  // API: Reset server database to initial clean state. Admin only. Preserves the current admin's credentials.
  router.post('/reset', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
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
  }));

  // Last-resort error handler: anything asyncHandler forwards via next(err), or
  // any synchronous throw, lands here instead of crashing the whole function
  // invocation. Vercel's own crash page hides the real error from the client;
  // this at least returns it as JSON, which curl/DevTools can show directly.
  router.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    if (res.headersSent) return;
    res.status(500).json({ success: false, message: err?.message || 'Erro interno do servidor.' });
  });

  return router;
}
