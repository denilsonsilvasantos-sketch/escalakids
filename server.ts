import express from 'express';
import path from 'path';
import fs from 'fs';
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
    anonKey: string;
  };
  version: number;
  lastUpdated: string;
}

const DEFAULT_SUPABASE_URL = 'https://iimgcdddyuspagpsijut.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWdjZGRkeXVzcGFncHNpanV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDI5NzUsImV4cCI6MjEwMzgxODk3NX0.CixePx8utvm1P6HiCzYwMdW9TTJZlDyWUTYsyoGgbds';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

let memoryDb: MevamDatabase | null = null;

function getDb(): MevamDatabase {
  if (memoryDb) return memoryDb;

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data dir:', e);
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial: MevamDatabase = {
      users: INITIAL_USERS,
      micros: INITIAL_MICROS,
      functions: INITIAL_FUNCTIONS,
      families: INITIAL_FAMILIES,
      people: INITIAL_PEOPLE,
      availabilities: INITIAL_AVAILABILITIES,
      schedules: INITIAL_SCHEDULES,
      rotationHistory: INITIAL_ROTATION_HISTORY,
      auditLogs: INITIAL_AUDIT_LOGS,
      supabaseConfig: {
        url: process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
      },
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
    memoryDb = {
      users: INITIAL_USERS,
      micros: INITIAL_MICROS,
      functions: INITIAL_FUNCTIONS,
      families: [],
      people: [],
      availabilities: [],
      schedules: [],
      rotationHistory: [],
      auditLogs: [],
      supabaseConfig: { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY },
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

let backendSupabaseSyncTimer: NodeJS.Timeout | null = null;

async function syncToSupabaseFromBackend(db: MevamDatabase): Promise<{ success: boolean; message?: string }> {
  try {
    const url = db.supabaseConfig?.url || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const anonKey = db.supabaseConfig?.anonKey || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    if (!url || !anonKey || url.includes('your-project-id')) {
      return { success: false, message: 'Supabase não configurado no servidor' };
    }

    const client = createClient(url, anonKey);

    // 1. Profiles (clean up demo users)
    if (db.users && db.users.length > 0) {
      const demoIds = ['user-macro-joao', 'user-micro-louvor', 'user-micro-prof', 'user-vol-lucas', 'user-vol-camila'];
      try {
        await client.from('profiles').delete().in('id', demoIds);
      } catch {
        // ignore
      }

      const validUsers = db.users.filter((u: any) => !demoIds.includes(u.id));
      if (validUsers.length > 0) {
        const userPayload = validUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username || null,
          email: u.email || null,
          password: u.password || '123',
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
    }

    // 2. Micros
    if (db.micros && db.micros.length > 0) {
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
    }

    // 3. Micro Functions (ensure FK to micros)
    if (db.functions && db.functions.length > 0 && db.micros && db.micros.length > 0) {
      const microIdSet = new Set(db.micros.map((m: any) => m.id));
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
    }

    // 4. Families
    if (db.families && db.families.length > 0) {
      const familyPayload = db.families.map((f: any) => ({
        id: f.id,
        name: f.name,
        priority: f.priority,
        notes: f.notes || null,
        created_at: f.createdAt || new Date().toISOString(),
        updated_at: f.updatedAt || new Date().toISOString()
      }));
      await client.from('families').upsert(familyPayload, { onConflict: 'id' });
    }

    // 5. People
    if (db.people && db.people.length > 0) {
      const familyIdSet = new Set((db.families || []).map((f: any) => f.id));
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));

  // API: Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API: Version check for lightweight cross-device polling
  app.get('/api/version', (_req, res) => {
    const db = getDb();
    res.json({ version: db.version, lastUpdated: db.lastUpdated });
  });

  // API: Get complete unified database (shared across all devices)
  app.get('/api/data', (_req, res) => {
    const db = getDb();
    res.json({
      success: true,
      data: db
    });
  });

  // API: Sync/Save data from any client device to the central server
  app.post('/api/data', (req, res) => {
    const incoming = req.body;
    const db = getDb();

    const merged: MevamDatabase = {
      ...db,
      users: incoming.users || db.users,
      micros: incoming.micros || db.micros,
      functions: incoming.functions || db.functions,
      families: incoming.families || db.families,
      people: incoming.people || db.people,
      availabilities: incoming.availabilities || db.availabilities,
      schedules: incoming.schedules || db.schedules,
      rotationHistory: incoming.rotationHistory || db.rotationHistory,
      auditLogs: incoming.auditLogs || db.auditLogs,
      supabaseConfig: incoming.supabaseConfig || db.supabaseConfig,
    };

    saveDb(merged);
    // Background cloud sync from backend
    scheduleBackendSupabaseSync(merged);

    res.json({ success: true, version: merged.version, lastUpdated: merged.lastUpdated });
  });

  // API: Trigger immediate Supabase sync
  app.post('/api/supabase/sync', async (_req, res) => {
    const db = getDb();
    const result = await syncToSupabaseFromBackend(db);
    res.json(result);
  });

  // API: Get active Supabase configuration (shared across devices)
  app.get('/api/config/supabase', (_req, res) => {
    const db = getDb();
    const url = db.supabaseConfig?.url || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const anonKey = db.supabaseConfig?.anonKey || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    res.json({
      url,
      anonKey,
      isConfigured: Boolean(url && anonKey && !url.includes('your-project-id'))
    });
  });

  // API: Set Supabase configuration on the server so all devices inherit it
  app.post('/api/config/supabase', (req, res) => {
    const { url, anonKey } = req.body;
    const db = getDb();
    db.supabaseConfig = {
      url: (url || '').trim(),
      anonKey: (anonKey || '').trim()
    };
    saveDb(db);
    res.json({ success: true, config: db.supabaseConfig });
  });

  // API: Reset server database to initial clean state
  app.post('/api/reset', (_req, res) => {
    const initial: MevamDatabase = {
      users: INITIAL_USERS,
      micros: INITIAL_MICROS,
      functions: INITIAL_FUNCTIONS,
      families: INITIAL_FAMILIES,
      people: INITIAL_PEOPLE,
      availabilities: INITIAL_AVAILABILITIES,
      schedules: INITIAL_SCHEDULES,
      rotationHistory: INITIAL_ROTATION_HISTORY,
      auditLogs: INITIAL_AUDIT_LOGS,
      supabaseConfig: {
        url: process.env.VITE_SUPABASE_URL || '',
        anonKey: process.env.VITE_SUPABASE_ANON_KEY || ''
      },
      version: 1,
      lastUpdated: new Date().toISOString()
    };
    saveDb(initial);
    res.json({ success: true, message: 'Dados restaurados para o padrão.' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MEVAM Kids Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
