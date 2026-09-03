import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Built-in MEVAM Kids Central Cloud Project (automatic sync across all devices)
export const DEFAULT_SUPABASE_URL = 'https://iimgcdddyuspagpsijut.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpbWdjZGRkeXVzcGFncHNpanV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDI5NzUsImV4cCI6MjEwMzgxODk3NX0.CixePx8utvm1P6HiCzYwMdW9TTJZlDyWUTYsyoGgbds';

// Read from Vite environment variables (Vercel / .env)
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const envSupabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Also allow localStorage override if needed
let localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('mevam_kids_supabase_url') || '' : '';
let localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('mevam_kids_supabase_key') || '' : '';

export let SUPABASE_URL = localSupabaseUrl || envSupabaseUrl || DEFAULT_SUPABASE_URL;
export let SUPABASE_ANON_KEY = localSupabaseAnonKey || envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_ANON_KEY.includes('your-anon-public-key')
  );
};

// Keep singleton on globalThis to prevent duplicate GoTrueClient warnings on hot reloads
const globalForSupabase = globalThis as unknown as { __supabaseClient?: SupabaseClient | null };

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!globalForSupabase.__supabaseClient) {
    try {
      globalForSupabase.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    } catch (err) {
      console.error('Erro ao inicializar cliente Supabase:', err);
      return null;
    }
  }

  return globalForSupabase.__supabaseClient;
};

export const setCustomSupabaseConfig = (url: string, key: string, syncToServer = true): void => {
  const cleanUrl = (url || '').trim();
  const cleanKey = (key || '').trim();

  SUPABASE_URL = cleanUrl;
  SUPABASE_ANON_KEY = cleanKey;
  localSupabaseUrl = cleanUrl;
  localSupabaseAnonKey = cleanKey;

  if (typeof window !== 'undefined') {
    if (cleanUrl && cleanKey) {
      localStorage.setItem('mevam_kids_supabase_url', cleanUrl);
      localStorage.setItem('mevam_kids_supabase_key', cleanKey);
    } else {
      localStorage.removeItem('mevam_kids_supabase_url');
      localStorage.removeItem('mevam_kids_supabase_key');
    }
    globalForSupabase.__supabaseClient = null; // reset client instance
  }

  if (syncToServer) {
    fetch('/api/config/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
    }).catch((e) => {
      console.warn('Could not sync supabase config to server:', e);
    });
  }
};

export const syncSupabaseConfigFromServer = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/config/supabase');
    if (!res.ok) return false;
    const data = await res.json();
    if (data.url && data.anonKey && data.isConfigured) {
      setCustomSupabaseConfig(data.url, data.anonKey, false);
      return true;
    }
  } catch {
    // server not reachable or offline
  }
  return false;
};
