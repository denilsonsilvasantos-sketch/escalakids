import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
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
        url: process.env.VITE_SUPABASE_URL || '',
        anonKey: process.env.VITE_SUPABASE_ANON_KEY || ''
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
      supabaseConfig: { url: '', anonKey: '' },
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
    res.json({ success: true, version: merged.version, lastUpdated: merged.lastUpdated });
  });

  // API: Get active Supabase configuration (shared across devices)
  app.get('/api/config/supabase', (_req, res) => {
    const db = getDb();
    const url = db.supabaseConfig?.url || process.env.VITE_SUPABASE_URL || '';
    const anonKey = db.supabaseConfig?.anonKey || process.env.VITE_SUPABASE_ANON_KEY || '';
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
