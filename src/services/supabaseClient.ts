import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite environment variables (Vercel / .env)
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const envSupabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Also allow localStorage override for testing in preview
const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('mevam_kids_supabase_url') || '' : '';
const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('mevam_kids_supabase_key') || '' : '';

export const SUPABASE_URL = localSupabaseUrl || envSupabaseUrl;
export const SUPABASE_ANON_KEY = localSupabaseAnonKey || envSupabaseAnonKey;

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

export const setCustomSupabaseConfig = (url: string, key: string): void => {
  if (typeof window !== 'undefined') {
    if (url && key) {
      localStorage.setItem('mevam_kids_supabase_url', url.trim());
      localStorage.setItem('mevam_kids_supabase_key', key.trim());
    } else {
      localStorage.removeItem('mevam_kids_supabase_url');
      localStorage.removeItem('mevam_kids_supabase_key');
    }
    clientInstance = null; // reset client instance
  }
};
