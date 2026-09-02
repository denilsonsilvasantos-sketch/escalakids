import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite environment variables (Vercel / .env)
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const envSupabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Also allow localStorage override for testing in preview
let localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('mevam_kids_supabase_url') || '' : '';
let localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('mevam_kids_supabase_key') || '' : '';

export let SUPABASE_URL = localSupabaseUrl || envSupabaseUrl;
export let SUPABASE_ANON_KEY = localSupabaseAnonKey || envSupabaseAnonKey;

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('your-project-id') &&
    !SUPABASE_ANON_KEY.includes('your-anon-public-key')
  );
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (err) {
      console.error('Erro ao inicializar cliente Supabase:', err);
      return null;
    }
  }

  return clientInstance;
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
    clientInstance = null; // reset client instance
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
