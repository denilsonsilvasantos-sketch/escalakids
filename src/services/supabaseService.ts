import { SupabaseSyncState } from '../types';

// This module used to talk to Supabase directly from the browser using a public anon key
// with wide-open write policies. That is what made it possible for anyone with the key
// (which is always public, by design) to read or overwrite the entire database.
//
// All cloud sync now happens server-side (server.ts), authenticated, using a service-role
// key that never reaches the browser. This file is just a thin client for those endpoints,
// kept so the existing UI (SupabaseSyncModal, Header) doesn't need to change shape.

const TOKEN_KEY = 'mevam_kids_token';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class SupabaseService {
  private syncState: SupabaseSyncState = {
    isConnected: false,
    isConfigured: false,
    lastSyncedAt: undefined,
    syncError: undefined,
    isSyncing: false
  };

  private listeners: Array<(state: SupabaseSyncState) => void> = [];

  getSyncState(): SupabaseSyncState {
    return { ...this.syncState };
  }

  subscribe(listener: (state: SupabaseSyncState) => void): () => void {
    this.listeners.push(listener);
    listener(this.getSyncState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const state = this.getSyncState();
    this.listeners.forEach((l) => l(state));
  }

  async refreshStatus(): Promise<void> {
    try {
      const res = await fetch('/api/config/supabase', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      this.syncState.isConfigured = Boolean(data.isConfigured);
      this.notify();
    } catch {
      // ignore
    }
  }

  // Pushes the server's current local data to the configured Supabase project.
  async exportAllToSupabase(_data?: unknown): Promise<{ success: boolean; message: string; details?: string }> {
    this.syncState.isSyncing = true;
    this.notify();
    try {
      const res = await fetch('/api/supabase/sync', { method: 'POST', headers: authHeaders() });
      const result = await res.json();
      this.syncState.isSyncing = false;
      this.syncState.isConnected = Boolean(result.success);
      this.syncState.syncError = result.success ? undefined : result.message;
      this.syncState.lastSyncedAt = result.success ? new Date().toISOString() : this.syncState.lastSyncedAt;
      this.notify();
      return {
        success: Boolean(result.success),
        message: result.success ? 'Dados sincronizados com sucesso no Supabase!' : (result.message || 'Falha ao sincronizar.')
      };
    } catch (e: any) {
      this.syncState.isSyncing = false;
      this.syncState.syncError = e?.message;
      this.notify();
      return { success: false, message: 'Erro ao exportar dados para o Supabase', details: e?.message };
    }
  }

  // Pulls from Supabase into the server, then returns whether the server has newer data
  // (the caller should follow this with storageService.pullFromServer(true)).
  async pullFromSupabase(): Promise<boolean> {
    this.syncState.isSyncing = true;
    this.notify();
    try {
      const res = await fetch('/api/supabase/pull', { method: 'POST', headers: authHeaders() });
      const ok = res.ok;
      this.syncState.isSyncing = false;
      this.syncState.isConnected = ok;
      this.syncState.lastSyncedAt = ok ? new Date().toISOString() : this.syncState.lastSyncedAt;
      this.notify();
      return ok;
    } catch {
      this.syncState.isSyncing = false;
      this.notify();
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
