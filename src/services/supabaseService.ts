import {
  getSupabaseClient,
  isSupabaseConfigured,
  SUPABASE_URL,
  setCustomSupabaseConfig
} from './supabaseClient';
import {
  Micro,
  MicroFunction,
  Person,
  Family,
  AvailabilityRule,
  Schedule,
  UserAccount,
  RotationHistoryItem,
  AuditLog,
  SupabaseSyncState
} from '../types';

const normalizeScheduleShift = (raw: string | undefined): 'MANHA' | 'NOITE' | 'AMBOS' | 'ESPECIAL' => {
  if (!raw) return 'NOITE';
  const upper = raw.toUpperCase();
  if (upper.includes('MANH') || upper === 'MANHA') return 'MANHA';
  if (upper.includes('AMB') || upper === 'AMBOS') return 'AMBOS';
  if (upper.includes('ESP')) return 'ESPECIAL';
  return 'NOITE';
};

const normalizeAvailabilityType = (raw: string | undefined): 'DIA_SEMANA_RECORRENTE' | 'DATA_ESPECIFICA' | 'TURNO_ESPECIFICO' => {
  if (!raw) return 'DIA_SEMANA_RECORRENTE';
  if (raw === 'DATA_ESPECIFICA' || raw === 'ESPECIFICA') return 'DATA_ESPECIFICA';
  if (raw === 'TURNO_ESPECIFICO') return 'TURNO_ESPECIFICO';
  return 'DIA_SEMANA_RECORRENTE';
};

class SupabaseService {
  private syncState: SupabaseSyncState = {
    isConnected: false,
    isConfigured: isSupabaseConfigured(),
    supabaseUrl: SUPABASE_URL,
    lastSyncedAt: undefined,
    syncError: undefined,
    isSyncing: false
  };

  private listeners: Array<(state: SupabaseSyncState) => void> = [];

  constructor() {
    if (this.syncState.isConfigured) {
      this.testConnection();
    }
  }

  getSyncState(): SupabaseSyncState {
    return {
      ...this.syncState,
      isConfigured: isSupabaseConfigured(),
      supabaseUrl: SUPABASE_URL
    };
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

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    missingProfilesTable?: boolean;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      this.syncState.isConnected = false;
      this.syncState.isConfigured = false;
      this.syncState.syncError = 'Credenciais do Supabase não configuradas no projeto.';
      this.notify();
      return { success: false, message: 'Supabase não configurado' };
    }

    try {
      this.syncState.isSyncing = true;
      this.notify();

      // 1. Check micros table
      const { error: microErr } = await client.from('micros').select('id').limit(1);
      if (microErr) {
        throw new Error(`Tabela 'micros' inacessível: ${microErr.message}`);
      }

      // 2. Check profiles table (vital for users and leaders)
      const { error: profileErr } = await client.from('profiles').select('id').limit(1);
      if (profileErr) {
        this.syncState.isConnected = true;
        this.syncState.isConfigured = true;
        this.syncState.syncError = `Atenção: A tabela "profiles" (líderes e acessos) não existe no Supabase (${profileErr.message}). Execute o script SQL para criá-la!`;
        this.syncState.lastSyncedAt = new Date().toISOString();
        this.syncState.isSyncing = false;
        this.notify();
        return {
          success: false,
          missingProfilesTable: true,
          message: `Conectado ao Supabase, mas a tabela "profiles" (de líderes e senhas) não foi encontrada (${profileErr.message}). Execute o script SQL no painel do Supabase para que os líderes criados fiquem salvos na nuvem!`
        };
      }

      this.syncState.isConnected = true;
      this.syncState.isConfigured = true;
      this.syncState.syncError = undefined;
      this.syncState.lastSyncedAt = new Date().toISOString();
      this.syncState.isSyncing = false;
      this.notify();
      return { success: true, message: 'Conectado com sucesso ao Supabase Cloud! Tabelas e perfis verificados.' };
    } catch (err: any) {
      console.warn('Supabase test connection failed:', err);
      this.syncState.isConnected = false;
      this.syncState.syncError = err.message || 'Falha ao conectar no Supabase. Verifique se as tabelas foram criadas.';
      this.syncState.isSyncing = false;
      this.notify();
      return { success: false, message: this.syncState.syncError || 'Erro de conexão' };
    }
  }

  // --- Push Entire Local Database to Supabase (Seed Cloud) ---
  async exportAllToSupabase(data: {
    users: UserAccount[];
    micros: Micro[];
    functions: MicroFunction[];
    families: Family[];
    people: Person[];
    availabilities: AvailabilityRule[];
    schedules: Schedule[];
    rotationHistory: RotationHistoryItem[];
    auditLogs: AuditLog[];
  }): Promise<{ success: boolean; message: string; details?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase não está configurado.' };
    }

    try {
      this.syncState.isSyncing = true;
      this.notify();

      // 1. Profiles / Users
      if (data.users.length > 0) {
        const userPayload = data.users.map((u) => ({
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
          last_login_at: u.lastLoginAt || null
        }));
        const { error } = await client.from('profiles').upsert(userPayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em profiles: ${error.message}`);
      }

      // 2. Micros
      if (data.micros.length > 0) {
        const microPayload = data.micros.map((m) => ({
          id: m.id,
          name: m.name,
          description: m.description || null,
          leader_name: m.leaderName || null,
          leader_id: m.leaderId || null,
          status: m.status,
          color: m.color,
          icon_name: m.iconName || 'Layers',
          default_shifts: m.defaultShifts || ['Manhã', 'Noite'],
          algorithm_weights: m.algorithmWeights || {}
        }));
        const { error } = await client.from('micros').upsert(microPayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em micros: ${error.message}`);
      }

      // 3. Functions
      if (data.functions.length > 0) {
        const functionPayload = data.functions.map((f) => ({
          id: f.id,
          micro_id: f.microId,
          name: f.name,
          description: f.description || null,
          category: f.category || null,
          criteria: f.criteria || {},
          default_required_count: f.defaultRequiredCount || 1
        }));
        const { error } = await client.from('micro_functions').upsert(functionPayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em micro_functions: ${error.message}`);
      }

      // 4. Families
      if (data.families.length > 0) {
        const familyPayload = data.families.map((f) => ({
          id: f.id,
          name: f.name,
          priority: f.priority,
          notes: f.notes || null,
          created_at: f.createdAt
        }));
        const { error } = await client.from('families').upsert(familyPayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em families: ${error.message}`);
      }

      // 5. People
      if (data.people.length > 0) {
        const peoplePayload = data.people.map((p) => ({
          id: p.id,
          name: p.name,
          nickname: p.nickname || null,
          birth_date: p.birthDate,
          phone: p.phone,
          whatsapp: p.whatsapp,
          email: p.email || null,
          avatar_url: p.avatarUrl || null,
          notes: p.notes || null,
          family_id: p.familyId || null,
          active: p.active,
          micro_ids: p.microIds || [],
          function_preferences: p.functionPreferences || []
        }));
        const { error } = await client.from('people').upsert(peoplePayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em people: ${error.message}`);
      }

      // 6. Availabilities
      if (data.availabilities.length > 0) {
        const availPayload = data.availabilities.map((a) => ({
          id: a.id,
          person_id: a.personId,
          type: normalizeAvailabilityType(a.type),
          day_of_week: a.dayOfWeek ?? null,
          shift: a.shift || null,
          specific_date: a.specificDate || null,
          is_available: a.isAvailable,
          reason: a.reason || null
        }));
        const { error } = await client.from('availability_rules').upsert(availPayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em availability_rules: ${error.message}`);
      }

      // 7. Schedules
      if (data.schedules.length > 0) {
        const schedPayload = data.schedules.map((s) => ({
          id: s.id,
          title: s.title,
          event_id: s.eventId || null,
          event_name: s.eventName,
          period: s.period || null,
          shift: normalizeScheduleShift(s.shift),
          dates: s.dates,
          micro_ids: s.microIds,
          status: s.status,
          quality_metrics: s.qualityMetrics || {},
          slots: s.slots || [],
          created_at: s.createdAt,
          updated_at: s.updatedAt
        }));
        const { error } = await client.from('schedules').upsert(schedPayload, { onConflict: 'id' });
        if (error) throw new Error(`Erro em schedules: ${error.message}`);
      }

      this.syncState.isConnected = true;
      this.syncState.syncError = undefined;
      this.syncState.lastSyncedAt = new Date().toISOString();
      this.syncState.isSyncing = false;
      this.notify();

      return {
        success: true,
        message: 'Dados sincronizados com sucesso no Supabase!'
      };
    } catch (err: any) {
      console.error('Export to Supabase error:', err);
      this.syncState.syncError = err.message;
      this.syncState.isSyncing = false;
      this.notify();
      return {
        success: false,
        message: 'Erro ao exportar dados para o Supabase',
        details: err.message
      };
    }
  }

  // --- Pull Remote Data from Supabase ---
  async fetchRemoteData(): Promise<{
    users?: UserAccount[];
    micros?: Micro[];
    functions?: MicroFunction[];
    families?: Family[];
    people?: Person[];
    availabilities?: AvailabilityRule[];
    schedules?: Schedule[];
  } | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      this.syncState.isSyncing = true;
      this.notify();

      const [
        usersRes,
        microsRes,
        functionsRes,
        familiesRes,
        peopleRes,
        availRes,
        schedRes
      ] = await Promise.all([
        client.from('profiles').select('*'),
        client.from('micros').select('*'),
        client.from('micro_functions').select('*'),
        client.from('families').select('*'),
        client.from('people').select('*'),
        client.from('availability_rules').select('*'),
        client.from('schedules').select('*')
      ]);

      const result: any = {};

      if (usersRes.data && usersRes.data.length > 0) {
        result.users = usersRes.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          username: u.username || undefined,
          email: u.email || undefined,
          password: u.password || '123',
          role: u.role,
          avatar: u.avatar || undefined,
          allowedMicroIds: u.allowed_micro_ids || [],
          primaryMicroId: u.primary_micro_id || undefined,
          personId: u.person_id || undefined,
          whatsapp: u.whatsapp || undefined,
          createdBy: u.created_by || undefined,
          createdByName: u.created_by_name || undefined,
          mustChangePassword: u.must_change_password ?? false,
          lastLoginAt: u.last_login_at || undefined
        }));
      }

      if (microsRes.data && microsRes.data.length > 0) {
        result.micros = microsRes.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description || undefined,
          leaderName: m.leader_name || undefined,
          leaderId: m.leader_id || undefined,
          status: m.status,
          color: m.color,
          iconName: m.icon_name || 'Layers',
          defaultShifts: m.default_shifts || ['Manhã', 'Noite'],
          algorithmWeights: m.algorithm_weights || {}
        }));
      }

      if (functionsRes.data && functionsRes.data.length > 0) {
        result.functions = functionsRes.data.map((f: any) => ({
          id: f.id,
          microId: f.micro_id,
          name: f.name,
          description: f.description || undefined,
          category: f.category || undefined,
          criteria: f.criteria || {},
          defaultRequiredCount: f.default_required_count || 1
        }));
      }

      if (familiesRes.data && familiesRes.data.length > 0) {
        result.families = familiesRes.data.map((f: any) => ({
          id: f.id,
          name: f.name,
          priority: f.priority,
          notes: f.notes || undefined,
          createdAt: f.created_at || new Date().toISOString()
        }));
      }

      if (peopleRes.data && peopleRes.data.length > 0) {
        result.people = peopleRes.data.map((p: any) => ({
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
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString()
        }));
      }

      if (availRes.data && availRes.data.length > 0) {
        result.availabilities = availRes.data.map((a: any) => ({
          id: a.id,
          personId: a.person_id,
          type: a.type === 'DATA_ESPECIFICA' ? 'DATA_ESPECIFICA' : 'RECORRENTE',
          dayOfWeek: a.day_of_week ?? undefined,
          shift: a.shift || undefined,
          specificDate: a.specific_date || undefined,
          isAvailable: a.is_available,
          reason: a.reason || undefined,
          createdAt: a.created_at || new Date().toISOString()
        }));
      }

      if (schedRes.data && schedRes.data.length > 0) {
        result.schedules = schedRes.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          eventId: s.event_id || undefined,
          eventName: s.event_name,
          period: s.period || undefined,
          shift: s.shift === 'MANHA' ? 'Manhã' : s.shift === 'NOITE' ? 'Noite' : s.shift === 'AMBOS' ? 'Ambos' : s.shift,
          dates: s.dates || [],
          microIds: s.micro_ids || [],
          status: s.status,
          qualityMetrics: s.quality_metrics || {},
          slots: s.slots || [],
          createdBy: s.created_by || undefined,
          updatedBy: s.updated_by || undefined,
          createdAt: s.created_at || new Date().toISOString(),
          updatedAt: s.updated_at || new Date().toISOString()
        }));
      }

      this.syncState.isConnected = true;
      this.syncState.syncError = undefined;
      this.syncState.lastSyncedAt = new Date().toISOString();
      this.syncState.isSyncing = false;
      this.notify();

      return result;
    } catch (err: any) {
      console.warn('Fetch from Supabase failed:', err);
      this.syncState.syncError = err.message;
      this.syncState.isSyncing = false;
      this.notify();
      return null;
    }
  }

  // --- Background Upsert Methods ---
  async syncPerson(person: Person): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('people').upsert(
        {
          id: person.id,
          name: person.name,
          nickname: person.nickname || null,
          birth_date: person.birthDate,
          phone: person.phone,
          whatsapp: person.whatsapp,
          email: person.email || null,
          avatar_url: person.avatarUrl || null,
          notes: person.notes || null,
          family_id: person.familyId || null,
          active: person.active,
          micro_ids: person.microIds || [],
          function_preferences: person.functionPreferences || [],
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.error('Supabase syncPerson error:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase syncPerson failed:', e);
      return { success: false, error: e?.message || 'Falha de conexão' };
    }
  }

  async syncSchedule(schedule: Schedule): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('schedules').upsert(
        {
          id: schedule.id,
          title: schedule.title,
          event_id: schedule.eventId || null,
          event_name: schedule.eventName,
          period: schedule.period || null,
          shift: normalizeScheduleShift(schedule.shift),
          dates: schedule.dates,
          micro_ids: schedule.microIds,
          status: schedule.status,
          quality_metrics: schedule.qualityMetrics || {},
          slots: schedule.slots || [],
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.error('Supabase syncSchedule error:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase syncSchedule failed:', e);
      return { success: false, error: e?.message || 'Falha de conexão' };
    }
  }

  async syncMicro(micro: Micro): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('micros').upsert(
        {
          id: micro.id,
          name: micro.name,
          description: micro.description || null,
          leader_name: micro.leaderName || null,
          leader_id: micro.leaderId || null,
          status: micro.status,
          color: micro.color,
          icon_name: micro.iconName || 'Layers',
          default_shifts: micro.defaultShifts || ['Manhã', 'Noite'],
          algorithm_weights: micro.algorithmWeights || {}
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.error('Supabase syncMicro error:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase syncMicro failed:', e);
      return { success: false, error: e?.message || 'Falha de conexão' };
    }
  }

  async deleteMicro(microId: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('micros').delete().eq('id', microId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase deleteMicro failed:', e);
      return { success: false, error: e?.message || 'Falha ao deletar micro' };
    }
  }

  async syncProfile(user: UserAccount): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        error: 'Supabase não inicializado.'
      };
    }
    try {
      const payload = {
        id: user.id,
        name: user.name,
        username: user.username || null,
        email: user.email || null,
        password: user.password || '123',
        role: user.role,
        avatar: user.avatar || null,
        allowed_micro_ids: user.allowedMicroIds || [],
        primary_micro_id: user.primaryMicroId || null,
        person_id: user.personId || null,
        whatsapp: user.whatsapp || null,
        created_by: user.createdBy || null,
        created_by_name: user.createdByName || null,
        must_change_password: user.mustChangePassword ?? false,
        last_login_at: user.lastLoginAt || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });

      if (error) {
        // If unique constraint on username fails, update by username
        if (error.code === '23505' && user.username) {
          const { error: updateErr } = await client
            .from('profiles')
            .update(payload)
            .eq('username', user.username);

          if (!updateErr) {
            return { success: true };
          }
        }

        console.error('Supabase syncProfile error:', error);
        return {
          success: false,
          error: `${error.message}${error.code ? ` (código: ${error.code})` : ''}`
        };
      }

      return { success: true };
    } catch (e: any) {
      console.error('Supabase syncProfile exception:', e);
      return {
        success: false,
        error: e?.message || 'Erro inesperado ao sincronizar perfil'
      };
    }
  }

  async syncFamily(family: Family): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não inicializado' };
    try {
      const { error } = await client.from('families').upsert(
        {
          id: family.id,
          name: family.name,
          priority: family.priority,
          notes: family.notes || null,
          created_at: family.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha de conexão' };
    }
  }

  async deleteFamily(familyId: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não inicializado' };
    try {
      const { error } = await client.from('families').delete().eq('id', familyId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao deletar família' };
    }
  }

  async syncAvailability(rule: AvailabilityRule): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não inicializado' };
    try {
      const { error } = await client.from('availability_rules').upsert(
        {
          id: rule.id,
          person_id: rule.personId,
          type: normalizeAvailabilityType(rule.type),
          day_of_week: rule.dayOfWeek ?? null,
          shift: rule.shift ?? null,
          specific_date: rule.specificDate ?? null,
          reason: rule.reason ?? null,
          is_available: rule.isAvailable,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha de conexão' };
    }
  }

  async deleteAvailability(ruleId: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não inicializado' };
    try {
      const { error } = await client.from('availability_rules').delete().eq('id', ruleId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Falha ao deletar disponibilidade' };
    }
  }

  async deleteProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('profiles').delete().eq('id', userId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase deleteProfile failed:', e);
      return { success: false, error: e?.message || 'Falha ao deletar perfil' };
    }
  }

  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('schedules').delete().eq('id', scheduleId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase deleteSchedule failed:', e);
      return { success: false, error: e?.message || 'Falha ao deletar escala' };
    }
  }

  async deletePerson(personId: string): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase não configurado' };
    try {
      const { error } = await client.from('people').delete().eq('id', personId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase deletePerson failed:', e);
      return { success: false, error: e?.message || 'Falha ao deletar voluntário' };
    }
  }
}

export const supabaseService = new SupabaseService();
