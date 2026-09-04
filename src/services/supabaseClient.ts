// The browser no longer talks to Supabase directly (no anon key is shipped to the client).
// All cloud sync now happens server-side, in server.ts, using a service-role key that is
// never exposed here. This file only exposes a small status flag so the UI can show
// whether cloud sync is configured on the server.

let cachedIsConfigured: boolean | null = null;

export const isSupabaseConfigured = (): boolean => {
  return cachedIsConfigured === true;
};

export const refreshSupabaseConfigStatus = async (
  authHeaders: Record<string, string>
): Promise<boolean> => {
  try {
    const res = await fetch('/api/config/supabase', { headers: authHeaders });
    if (!res.ok) return false;
    const data = await res.json();
    cachedIsConfigured = Boolean(data.isConfigured);
    return cachedIsConfigured;
  } catch {
    return false;
  }
};
