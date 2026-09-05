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
  UserRole,
  BirthdayNotification,
  ScheduleSlot
} from '../types';
import { getScheduleDisplayName } from '../utils/personUtils';
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
} from '../data/seedData';
import bcrypt from 'bcryptjs';
import { supabaseService } from './supabaseService';

const TOKEN_KEY = 'mevam_kids_token';
const SESSION_FLAG_KEY = 'mevam_kids_session_authenticated';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'mevam_kids_current_user_id',
  USERS: 'mevam_kids_users',
  MICROS: 'mevam_kids_micros',
  FUNCTIONS: 'mevam_kids_functions',
  FAMILIES: 'mevam_kids_families',
  PEOPLE: 'mevam_kids_people',
  AVAILABILITIES: 'mevam_kids_availabilities',
  SCHEDULES: 'mevam_kids_schedules',
  ROTATION_HISTORY: 'mevam_kids_rotation_history',
  AUDIT_LOGS: 'mevam_kids_audit_logs',
};

// Legacy mock demo IDs to ensure clean zero-state across all browsers
const MOCK_PEOPLE_IDS = new Set([
  'p-denilson',
  'p-joao-silva',
  'p-maria-silva',
  'p-pedro-silva',
  'p-lucas-almeida',
  'p-camila-rocha',
  'p-marcos-oliveira',
  'p-aline-pereira',
  'p-gabriel-ribeiro',
  'p-juliana-santos',
  'p-roberta-lima',
  'p-carlos-lima',
  'p-leticia-mendes',
  'p-thiago-martins',
  'p-ana-ferreira',
  'p-felipe-ferreira',
  'p-beatriz-souza',
  'p-renato-costa'
]);
const MOCK_FAMILY_IDS = new Set(['fam-silva', 'fam-ferreira', 'fam-santos']);
const MOCK_SCHEDULE_IDS = new Set(['sched-set-2026']);

class StorageService {
  private currentServerVersion = 0;
  private isSyncingWithServer = false;
  private isSyncingSupabase = false;
  private pushDebounceTimer: any = null;
  private isInitialized = false;

  constructor() {
    // Sync no longer starts automatically: pulling the full dataset requires an
    // authenticated session now, so App.tsx calls startSync() only after login
    // succeeds (or after a stored session token is confirmed valid).
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  private authHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        this.save(key, fallback, false);
        return fallback;
      }
      return JSON.parse(data) as T;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, data: T, syncToServer = true): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      if (syncToServer && key !== STORAGE_KEYS.CURRENT_USER_ID) {
        this.pushToServerDebounced();
      }
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  private pushToServerDebounced(): void {
    if (typeof window === 'undefined') return;
    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
    }
    this.pushDebounceTimer = setTimeout(() => {
      this.syncAllToServer();
    }, 350);
  }

  async syncAllToServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!this.getToken()) return false;
    try {
      const payload = this.getAllDataForExport();
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        this.forceLogout();
        return false;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.version) {
          this.currentServerVersion = data.version;
        }
        return true;
      }
    } catch (err) {
      console.warn('Sync to server failed (offline or network):', err);
    }
    return false;
  }

  async pullFromServer(force = false): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!this.getToken()) return false;
    if (this.isSyncingWithServer) return false;
    try {
      this.isSyncingWithServer = true;

      // Check version first if not forced
      if (!force && this.currentServerVersion > 0) {
        try {
          const vRes = await fetch('/api/version', { headers: this.authHeaders() });
          if (vRes.status === 401) {
            this.isSyncingWithServer = false;
            this.forceLogout();
            return false;
          }
          if (vRes.ok) {
            const vData = await vRes.json();
            if (vData.version <= this.currentServerVersion) {
              this.isSyncingWithServer = false;
              return false; // already up to date
            }
          }
        } catch {
          this.isSyncingWithServer = false;
          return false;
        }
      }

      const res = await fetch('/api/data', { headers: this.authHeaders() });
      if (res.status === 401) {
        this.isSyncingWithServer = false;
        this.forceLogout();
        return false;
      }
      if (!res.ok) {
        this.isSyncingWithServer = false;
        return false;
      }

      const body = await res.json();
      if (!body.success || !body.data) {
        this.isSyncingWithServer = false;
        return false;
      }

      const serverData = body.data;

      let modified = false;

      if (serverData.users && Array.isArray(serverData.users)) {
        this.save(STORAGE_KEYS.USERS, serverData.users, false);
        modified = true;
      }
      if (serverData.micros && Array.isArray(serverData.micros)) {
        this.save(STORAGE_KEYS.MICROS, serverData.micros, false);
        modified = true;
      }
      if (serverData.functions && Array.isArray(serverData.functions)) {
        this.save(STORAGE_KEYS.FUNCTIONS, serverData.functions, false);
        modified = true;
      }
      if (serverData.families && Array.isArray(serverData.families)) {
        this.save(STORAGE_KEYS.FAMILIES, serverData.families, false);
        modified = true;
      }
      if (serverData.people && Array.isArray(serverData.people)) {
        this.save(STORAGE_KEYS.PEOPLE, serverData.people, false);
        modified = true;
      }
      if (serverData.availabilities && Array.isArray(serverData.availabilities)) {
        this.save(STORAGE_KEYS.AVAILABILITIES, serverData.availabilities, false);
        modified = true;
      }
      if (serverData.schedules && Array.isArray(serverData.schedules)) {
        this.save(STORAGE_KEYS.SCHEDULES, serverData.schedules, false);
        modified = true;
      }
      if (serverData.rotationHistory && Array.isArray(serverData.rotationHistory)) {
        this.save(STORAGE_KEYS.ROTATION_HISTORY, serverData.rotationHistory, false);
        modified = true;
      }
      if (serverData.auditLogs && Array.isArray(serverData.auditLogs)) {
        this.save(STORAGE_KEYS.AUDIT_LOGS, serverData.auditLogs, false);
        modified = true;
      }

      if (serverData.version) {
        this.currentServerVersion = serverData.version;
      }

      this.isSyncingWithServer = false;

      if (modified) {
        window.dispatchEvent(new CustomEvent('mevam_data_synced', { detail: { version: this.currentServerVersion } }));
      }
      return true;
    } catch (err) {
      console.warn('Pull from server failed:', err);
      this.isSyncingWithServer = false;
      return false;
    }
  }

  async forcePullFromServer(): Promise<{ success: boolean; count: number }> {
    this.currentServerVersion = 0;
    await this.pullFromServer(true);
    const count = this.getPeople().length;
    return { success: true, count };
  }

  async clearAllVolunteers(): Promise<void> {
    this.save(STORAGE_KEYS.PEOPLE, [], false);
    this.save(STORAGE_KEYS.AVAILABILITIES, [], false);
    const schedules = this.getSchedules();
    const updatedSchedules = schedules.map(s => ({
      ...s,
      slots: s.slots.map(sl => ({
        ...sl,
        assignedPersonId: undefined,
        personId: undefined,
        personName: undefined
      }))
    }));
    this.save(STORAGE_KEYS.SCHEDULES, updatedSchedules, false);
    this.addAuditLog('LIMPEZA_VOLUNTARIOS', 'Lista de voluntários zerada no sistema.', 'SYSTEM');
    await this.syncAllToServer();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mevam_data_synced', { detail: { version: this.currentServerVersion } }));
    }
  }

  // Starts cross-device sync. Must only be called once a valid session token exists
  // (i.e. after a successful login or a successful checkSession() restore) — every
  // sync endpoint now requires authentication.
  startSync(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Initial immediate pull from the local server (which is itself kept in sync
    //    with Supabase server-side, using credentials that never reach the browser)
    this.pullFromServer(true);
    supabaseService.refreshStatus();

    // 2. Continuous local server synchronization (checks /api/version every 5 seconds)
    setInterval(() => {
      this.pullFromServer(false);
    }, 5000);

    // 3. On tab focus and visibility change, synchronize immediately
    window.addEventListener('focus', () => {
      this.pullFromServer(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullFromServer(false);
      }
    });
  }

  // Backward-compatible alias used by the login/session-restore flow.
  initServerSync(): void {
    this.startSync();
  }

  private forceLogout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_FLAG_KEY);
    this.isInitialized = false;
    window.dispatchEvent(new CustomEvent('mevam_session_expired'));
  }

  // --- Auth & Users ---
  getUsers(): UserAccount[] {
    let users = this.load<UserAccount[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    let modified = false;

    // Filter out old demo/mock users
    const demoIds = new Set(['user-macro-joao', 'user-micro-louvor', 'user-micro-prof', 'user-vol-lucas', 'user-vol-camila']);
    const filteredUsers = users.filter((u) => {
      if (demoIds.has(u.id)) return false;
      if (u.role === 'VOLUNTARIO') return false;
      return true;
    });

    if (filteredUsers.length !== users.length) {
      users = filteredUsers;
      modified = true;
    }

    // Ensure an admin placeholder exists locally so the UI has something to render
    // before the first successful sync. Its real credentials (and password hash)
    // live only on the server — this placeholder never carries a working password.
    let admin = users.find((u) => u.role === 'ADMIN_LIDERANCA' || u.id === 'user-admin');
    if (!admin) {
      admin = {
        id: 'user-admin',
        name: 'Administrador',
        username: 'admin',
        role: 'ADMIN_LIDERANCA',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
      users.unshift(admin);
      modified = true;
    } else if (admin.personId) {
      delete admin.personId;
      modified = true;
    }

    // Ensure all other users have valid usernames
    users.forEach((u) => {
      if (u.id !== 'user-admin' && !u.username) {
        const firstName = u.name.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        u.username = firstName;
        modified = true;
      }
    });

    if (modified) {
      this.save(STORAGE_KEYS.USERS, users);
    }

    return users;
  }

  getCurrentUser(): UserAccount {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user-admin';
    return users.find((u) => u.id === currentId) || users[0];
  }

  setCurrentUser(userId: string): UserAccount {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId) || users[0];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    localStorage.setItem(SESSION_FLAG_KEY, 'true');
    this.addAuditLog('TROCA_USUARIO', `Usuário ativo alterado para ${user.name} (${user.role})`, 'SYSTEM');
    return user;
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(TOKEN_KEY)) && localStorage.getItem(SESSION_FLAG_KEY) === 'true';
  }

  // Credentials are verified on the server (which holds the password hashes) — the
  // client never sees or compares any password. A successful call returns a session
  // token that must be attached to every subsequent /api/* request.
  async authenticate(loginIdentifier: string, passwordInput: string): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    const cleanId = (loginIdentifier || '').trim();
    const cleanPass = (passwordInput || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, message: 'Por favor, informe o nome de usuário e a senha.' };
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: cleanId, password: cleanPass })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, message: data.message || 'Usuário ou senha incorretos.' };
      }

      const user: UserAccount = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(SESSION_FLAG_KEY, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);

      // Merge the authenticated user into the local cache so the UI has it immediately.
      const users = this.load<UserAccount[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) users[idx] = { ...users[idx], ...user };
      else users.unshift(user);
      this.save(STORAGE_KEYS.USERS, users, false);

      this.addAuditLog('LOGIN_USUARIO', `Login realizado com sucesso: ${user.name} (${user.role}) - Usuário: ${user.username || user.id}`, 'SYSTEM');

      return { success: true, user };
    } catch (err) {
      console.warn('Login request failed:', err);
      return { success: false, message: 'Não foi possível conectar ao servidor. Verifique sua conexão.' };
    }
  }

  // Restores a session from a previously stored token (called on app boot). Returns
  // the current user if the token is still valid, or null if the user must log in again.
  async checkSession(): Promise<UserAccount | null> {
    if (typeof window === 'undefined') return null;
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/me', { headers: this.authHeaders() });
      if (!res.ok) {
        this.forceLogout();
        return null;
      }
      const data = await res.json();
      if (!data.success || !data.user) {
        this.forceLogout();
        return null;
      }
      localStorage.setItem(SESSION_FLAG_KEY, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, data.user.id);
      return data.user as UserAccount;
    } catch (err) {
      console.warn('Session check failed (offline?). Keeping local session for now.', err);
      // Network error, not an invalid session: let the user keep working offline
      // with locally cached data rather than forcing a logout.
      return this.getCurrentUser();
    }
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    this.addAuditLog('LOGOUT_USUARIO', 'Sessão encerrada.', 'SYSTEM');
    if (token) {
      try {
        await fetch('/api/logout', { method: 'POST', headers: this.authHeaders() });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_FLAG_KEY);
    this.isInitialized = false;
  }

  saveUsers(users: UserAccount[]): void {
    this.save(STORAGE_KEYS.USERS, users);
  }

  // Delegated User Management (Admin -> Macro Leader -> Micro Leader)
  async createDelegatedUser(
    userData: {
      name: string;
      username?: string;
      email?: string;
      password?: string;
      role: UserRole;
      allowedMicroIds?: string[];
      primaryMicroId?: string;
      personId?: string;
      whatsapp?: string;
    },
    creator: UserAccount = this.getCurrentUser()
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    message: string;
    supabaseSynced?: boolean;
    errorDetails?: string;
    plainPassword?: string;
  }> {
    const users = this.getUsers();

    // Verification of permissions
    if (userData.role === 'VOLUNTARIO') {
      return { success: false, message: 'Voluntários não possuem acesso de usuário ao sistema. Cadastre-os no menu de Voluntários.' };
    }

    if (creator.role === 'ADMIN_LIDERANCA') {
      // Admin can create any leadership role (LIDER_MACRO, LIDER_MICRO, COORDENADOR)
    } else if (creator.role === 'LIDER_MACRO') {
      // Macro Leader can create LIDER_MICRO (for their allowed micros)
      if (userData.role !== 'LIDER_MICRO') {
        return { success: false, message: 'Líderes Macro só têm permissão para cadastrar Líderes de Micro.' };
      }
      if (userData.primaryMicroId && !creator.allowedMicroIds?.includes(userData.primaryMicroId)) {
        return { success: false, message: 'Você só pode criar líderes para micros dentro da sua frente de supervisão.' };
      }
    } else {
      return { success: false, message: 'Você não tem permissão para criar novos usuários ou líderes.' };
    }

    // Validation
    const cleanName = userData.name.trim();
    if (!cleanName) {
      return { success: false, message: 'O nome do usuário é obrigatório.' };
    }

    // Default username if not provided: first name in lowercase without accents
    const firstName = cleanName.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanUsername = (userData.username || firstName).trim().toLowerCase();

    // Check duplicate username
    const existing = users.find((u) => u.username?.toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, message: `O nome de usuário "${cleanUsername}" já está em uso. Escolha outro.` };
    }

    // Default initial password: provided password, or first name + '123', or '123'
    const initialPassword = userData.password?.trim() || `${firstName}123`;
    const passwordHash = bcrypt.hashSync(initialPassword, 10);

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      email: userData.email?.trim() || `${cleanUsername}@mevamkids.org`,
      password: passwordHash,
      role: userData.role,
      allowedMicroIds: userData.allowedMicroIds || [],
      primaryMicroId: userData.primaryMicroId,
      personId: userData.personId,
      whatsapp: userData.whatsapp?.trim(),
      createdBy: creator.id,
      createdByName: `${creator.name} (${creator.role})`,
      mustChangePassword: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`
    };

    users.push(newUser);
    this.saveUsers(users);
    await this.syncAllToServer();

    this.addAuditLog(
      'CRIACAO_USUARIO',
      `Novo usuário criado: ${newUser.name} (${newUser.role}) com usuário "${newUser.username}" por ${creator.name}.`,
      'SYSTEM'
    );

    return {
      success: true,
      user: newUser,
      supabaseSynced: true,
      plainPassword: initialPassword,
      message: `Líder "${newUser.name}" cadastrado e sincronizado com sucesso em todos os aparelhos! Usuário: ${newUser.username} | Senha inicial: ${initialPassword}`
    };
  }

  async updateUserPassword(
    targetUserId: string,
    newPassword: string,
    actor: UserAccount = this.getCurrentUser()
  ): Promise<{ success: boolean; message: string; supabaseSynced?: boolean; errorDetails?: string; plainPassword?: string }> {
    const users = this.getUsers();
    const targetIndex = users.findIndex((u) => u.id === targetUserId);
    if (targetIndex === -1) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const targetUser = users[targetIndex];

    // Permission check: self, Admin, or creator
    const isSelf = actor.id === targetUserId;
    const isAdmin = actor.role === 'ADMIN_LIDERANCA';
    const isCreator = targetUser.createdBy === actor.id;
    const isMacroSupervisor =
      actor.role === 'LIDER_MACRO' &&
      targetUser.primaryMicroId &&
      actor.allowedMicroIds?.includes(targetUser.primaryMicroId);

    if (!isSelf && !isAdmin && !isCreator && !isMacroSupervisor) {
      return { success: false, message: 'Você não tem permissão para alterar a senha deste usuário.' };
    }

    if (!newPassword || newPassword.trim().length < 3) {
      return { success: false, message: 'A senha deve ter no mínimo 3 caracteres.' };
    }

    const cleanNewPassword = newPassword.trim();
    targetUser.password = bcrypt.hashSync(cleanNewPassword, 10);
    targetUser.mustChangePassword = false;
    users[targetIndex] = targetUser;
    this.saveUsers(users);
    await this.syncAllToServer();

    this.addAuditLog('ALTERACAO_SENHA', `Senha alterada para o usuário ${targetUser.name} por ${actor.name}.`, 'SYSTEM');
    return {
      success: true,
      supabaseSynced: true,
      plainPassword: cleanNewPassword,
      message: 'Senha atualizada com sucesso no banco de dados!'
    };
  }

  async updateUserAccount(
    updatedUser: UserAccount,
    actor: UserAccount = this.getCurrentUser()
  ): Promise<{ success: boolean; message: string }> {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === updatedUser.id);
    if (idx === -1) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    // Never allow a password to be overwritten through the generic account-update path:
    // password changes must go through updateUserPassword, which hashes the value.
    const { password: _ignoredPassword, ...updatedUserWithoutPassword } = updatedUser as any;
    users[idx] = { ...users[idx], ...updatedUserWithoutPassword };
    this.saveUsers(users);
    await this.syncAllToServer();
    this.addAuditLog('ATUALIZACAO_USUARIO', `Dados de ${updatedUser.name} atualizados por ${actor.name}.`, 'SYSTEM');
    return { success: true, message: 'Usuário atualizado com sucesso!' };
  }

  async deleteUserAccount(
    userId: string,
    actor: UserAccount = this.getCurrentUser()
  ): Promise<{ success: boolean; message: string }> {
    const currentUser = this.getCurrentUser();
    const isSuperAdmin = actor.role === 'ADMIN_LIDERANCA' || currentUser.role === 'ADMIN_LIDERANCA' || actor.id === 'user-admin';
    if (!isSuperAdmin) {
      return { success: false, message: 'Apenas o Administrador pode excluir contas de usuários.' };
    }

    if (userId === 'user-admin') {
      return { success: false, message: 'Não é permitido excluir o Administrador principal.' };
    }

    let users = this.getUsers();
    const toDelete = users.find((u) => u.id === userId);
    users = users.filter((u) => u.id !== userId);
    this.saveUsers(users);
    await this.syncAllToServer();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mevam_data_synced', { detail: { source: 'user_delete' } }));
    }

    this.addAuditLog('EXCLUSAO_USUARIO', `Conta do usuário ${toDelete?.name} (${toDelete?.role}) excluída por ${actor.name}.`, 'SYSTEM');
    return { success: true, message: 'Usuário excluído com sucesso.' };
  }

  getManageableUsers(actor: UserAccount = this.getCurrentUser()): UserAccount[] {
    const all = this.getUsers();
    if (actor.role === 'ADMIN_LIDERANCA' || actor.role === 'COORDENADOR') {
      return all;
    }
    if (actor.role === 'LIDER_MACRO') {
      const allowed = actor.allowedMicroIds || [];
      return all.filter(
        (u) =>
          u.id === actor.id ||
          u.createdBy === actor.id ||
          (u.primaryMicroId && allowed.includes(u.primaryMicroId)) ||
          u.role === 'VOLUNTARIO'
      );
    }
    if (actor.role === 'LIDER_MICRO') {
      return all.filter((u) => u.id === actor.id || (u.primaryMicroId && u.primaryMicroId === actor.primaryMicroId));
    }
    return all.filter((u) => u.id === actor.id);
  }

  canAccessMicro(microId: string, user: UserAccount = this.getCurrentUser()): boolean {
    if (user.role === 'ADMIN_LIDERANCA' || user.role === 'COORDENADOR') return true;
    if (user.role === 'LIDER_MACRO') {
      return !!user.allowedMicroIds?.includes(microId);
    }
    if (user.role === 'LIDER_MICRO') {
      return user.primaryMicroId === microId;
    }
    if (user.role === 'VOLUNTARIO') {
      // Volunteers can view micros they belong to
      if (user.personId) {
        const person = this.getPersonById(user.personId);
        return Boolean(person?.microIds.includes(microId));
      }
    }
    return false;
  }

  canAdministerSystem(user: UserAccount = this.getCurrentUser()): boolean {
    return user.role === 'ADMIN_LIDERANCA';
  }

  canManageSchedules(user: UserAccount = this.getCurrentUser()): boolean {
    return user.role === 'ADMIN_LIDERANCA' || user.role === 'LIDER_MACRO' || user.role === 'LIDER_MICRO';
  }

  canManageVolunteers(user: UserAccount = this.getCurrentUser()): boolean {
    return user.role === 'ADMIN_LIDERANCA' || user.role === 'LIDER_MACRO';
  }

  // Hierarchy Filter: Filter micros by current user scope
  getAccessibleMicros(user: UserAccount = this.getCurrentUser()): Micro[] {
    const all = this.getMicros();
    if (user.role === 'ADMIN_LIDERANCA' || user.role === 'COORDENADOR' || user.role === 'OBSERVADOR') {
      return all;
    }
    if (user.role === 'LIDER_MACRO') {
      const allowed = user.allowedMicroIds || [];
      return all.filter((m) => allowed.includes(m.id));
    }
    if (user.role === 'LIDER_MICRO') {
      return all.filter((m) => m.id === user.primaryMicroId);
    }
    if (user.role === 'VOLUNTARIO' && user.personId) {
      const person = this.getPersonById(user.personId);
      const personMicros = person?.microIds || [];
      return all.filter((m) => personMicros.includes(m.id));
    }
    return all;
  }

  // Hierarchy Filter: Filter schedules by user scope
  getAccessibleSchedules(user: UserAccount = this.getCurrentUser()): Schedule[] {
    const all = this.getSchedules();
    if (user.role === 'ADMIN_LIDERANCA' || user.role === 'COORDENADOR' || user.role === 'OBSERVADOR') {
      return all;
    }
    if (user.role === 'LIDER_MACRO') {
      const allowed = user.allowedMicroIds || [];
      return all.filter((s) => s.microIds.some((mId) => allowed.includes(mId)));
    }
    if (user.role === 'LIDER_MICRO') {
      return all.filter((s) => s.microIds.includes(user.primaryMicroId || ''));
    }
    if (user.role === 'VOLUNTARIO') {
      // Volunteers can see published or confirmed schedules
      return all.filter((s) => s.status === 'PUBLICADA' || s.status === 'CONFIRMADA');
    }
    return all;
  }

  // Hierarchy Filter: Filter volunteers by user scope
  getAccessiblePeople(user: UserAccount = this.getCurrentUser()): Person[] {
    const all = this.getPeople();
    if (user.role === 'ADMIN_LIDERANCA' || user.role === 'COORDENADOR' || user.role === 'OBSERVADOR') {
      return all;
    }
    if (user.role === 'LIDER_MACRO') {
      const allowed = user.allowedMicroIds || [];
      return all.filter((p) => p.microIds.some((mId) => allowed.includes(mId)));
    }
    if (user.role === 'LIDER_MICRO') {
      return all.filter((p) => p.microIds.includes(user.primaryMicroId || ''));
    }
    if (user.role === 'VOLUNTARIO') {
      if (user.personId) {
        return all.filter((p) => p.id === user.personId);
      }
      return all.filter((p) => p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase());
    }
    return all;
  }

  // Get specific volunteer assignments across all schedules
  getVolunteerAssignments(personId: string): Array<{
    scheduleId: string;
    scheduleTitle: string;
    date: string;
    shift: string;
    microName: string;
    functionName: string;
    sectionTitle?: string;
    status: string;
  }> {
    const schedules = this.getSchedules();
    const micros = this.getMicros();
    const functions = this.getFunctions();
    const results: Array<{
      scheduleId: string;
      scheduleTitle: string;
      date: string;
      shift: string;
      microName: string;
      functionName: string;
      sectionTitle?: string;
      status: string;
    }> = [];

    for (const sched of schedules) {
      const mySlots = sched.slots.filter((s) => s.assignedPersonId === personId);
      for (const slot of mySlots) {
        const micro = micros.find((m) => m.id === slot.microId);
        const fn = functions.find((f) => f.id === slot.functionId);
        results.push({
          scheduleId: sched.id,
          scheduleTitle: sched.title,
          date: slot.date,
          shift: sched.shift,
          microName: micro?.name || slot.microId,
          functionName: fn?.name || slot.functionId,
          sectionTitle: slot.sectionTitle,
          status: sched.status
        });
      }
    }

    return results.sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- Micros ---
  getMicros(): Micro[] {
    return this.load<Micro[]>(STORAGE_KEYS.MICROS, INITIAL_MICROS);
  }

  getMicroById(id: string): Micro | undefined {
    return this.getMicros().find((m) => m.id === id);
  }

  saveMicro(micro: Micro, applyToFunctions: boolean = false): void {
    const micros = this.getMicros();
    const idx = micros.findIndex((m) => m.id === micro.id);
    if (idx >= 0) {
      micros[idx] = micro;
      this.addAuditLog('EDICAO_MICRO', `Micro ${micro.name} atualizado.`, 'MICRO');
    } else {
      micros.push(micro);
      this.addAuditLog('CRIACAO_MICRO', `Novo micro ${micro.name} criado.`, 'MICRO');
    }
    this.save(STORAGE_KEYS.MICROS, micros);

    if (applyToFunctions && micro.defaultShifts && micro.defaultShifts.length > 0) {
      const allFunctions = this.getFunctions();
      let changed = false;
      const updatedFunctions = allFunctions.map((fn) => {
        if (fn.microId === micro.id) {
          changed = true;
          return {
            ...fn,
            criteria: {
              ...fn.criteria,
              allowedShifts: micro.defaultShifts,
              specialEventNames: micro.specialEventNames,
              hasShiftPreference: true
            },
            updatedAt: new Date().toISOString()
          };
        }
        return fn;
      });

      if (changed) {
        this.save(STORAGE_KEYS.FUNCTIONS, updatedFunctions);
        this.addAuditLog(
          'EDICAO_MICRO',
          `Período do micro ${micro.name} replicado para todas as suas funções.`,
          'MICRO'
        );
      }
    }
  }

  updateMicroPeriod(
    microId: string,
    shifts: string[],
    specialEventNames?: string,
    applyToFunctions: boolean = false
  ): Micro | undefined {
    const micro = this.getMicroById(microId);
    if (!micro) return undefined;

    const updatedMicro: Micro = {
      ...micro,
      defaultShifts: shifts,
      specialEventNames: shifts.includes('ESPECIAL') ? specialEventNames?.trim() : undefined,
      updatedAt: new Date().toISOString()
    };

    this.saveMicro(updatedMicro, applyToFunctions);
    return updatedMicro;
  }

  deleteMicro(id: string): void {
    const micro = this.getMicroById(id);
    const micros = this.getMicros().filter((m) => m.id !== id);
    this.save(STORAGE_KEYS.MICROS, micros);

    // Delete all functions belonging to this micro
    const functions = this.getFunctions().filter((f) => f.microId !== id);
    this.save(STORAGE_KEYS.FUNCTIONS, functions);

    // Unlink micro from all volunteers
    const people = this.getPeople().map((p) => {
      const updatedMicroIds = p.microIds.filter((mId) => mId !== id);
      const updatedPrefs = p.functionPreferences.filter((pref) => pref.microId !== id);
      return {
        ...p,
        microIds: updatedMicroIds,
        functionPreferences: updatedPrefs
      };
    });
    this.save(STORAGE_KEYS.PEOPLE, people);

    // Remove micro and its slots from all active schedules
    const schedules = this.getSchedules().map((sched) => {
      const updatedMicroIds = sched.microIds.filter((mId) => mId !== id);
      const updatedSlots = sched.slots.filter((slot) => slot.microId !== id);
      return {
        ...sched,
        microIds: updatedMicroIds,
        slots: updatedSlots
      };
    });
    this.save(STORAGE_KEYS.SCHEDULES, schedules);

    if (micro) {
      this.addAuditLog('EXCLUSAO_MICRO', `Micro ${micro.name} e suas funções associadas foram excluídos.`, 'MICRO');
    }
  }

  // --- Functions ---
  getFunctions(): MicroFunction[] {
    const functions = this.load<MicroFunction[]>(STORAGE_KEYS.FUNCTIONS, INITIAL_FUNCTIONS);
    // Sorted centrally so every screen that lists a micro's functions (schedule
    // grids, Micros & Funções, the "add function" picker) agrees on the same
    // order automatically. Stable sort: functions without an explicit `order`
    // (older records) simply keep whatever relative position they already had.
    return [...functions].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }

  getFunctionsByMicro(microId: string): MicroFunction[] {
    return this.getFunctions().filter((f) => f.microId === microId);
  }

  getFunctionById(id: string): MicroFunction | undefined {
    return this.getFunctions().find((f) => f.id === id);
  }

  saveFunction(fn: MicroFunction): void {
    const functions = this.getFunctions();
    const idx = functions.findIndex((f) => f.id === fn.id);
    if (idx >= 0) {
      functions[idx] = { ...fn, order: fn.order ?? functions[idx].order };
      this.addAuditLog('EDICAO_FUNCAO', `Função ${fn.name} atualizada.`, 'FUNCTION');
    } else {
      const siblingOrders = functions.filter((f) => f.microId === fn.microId).map((f) => f.order ?? 0);
      const nextOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
      functions.push({ ...fn, order: fn.order ?? nextOrder });
      this.addAuditLog('CRIACAO_FUNCAO', `Nova função ${fn.name} adicionada.`, 'FUNCTION');
    }
    this.save(STORAGE_KEYS.FUNCTIONS, functions);
  }

  // Swaps this function's display position with its immediate neighbor (within
  // the same micro). Normalizes every sibling to an explicit sequential
  // `order` first, so this also works for older functions that never had one.
  moveFunctionOrder(functionId: string, direction: 'up' | 'down'): void {
    const all = this.getFunctions();
    const target = all.find((f) => f.id === functionId);
    if (!target) return;

    const siblings = all.filter((f) => f.microId === target.microId);
    siblings.forEach((f, i) => { f.order = i; });

    const idx = siblings.findIndex((f) => f.id === functionId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const tmp = siblings[idx].order;
    siblings[idx].order = siblings[swapIdx].order;
    siblings[swapIdx].order = tmp;

    const others = all.filter((f) => f.microId !== target.microId);
    this.save(STORAGE_KEYS.FUNCTIONS, [...others, ...siblings]);
  }

  deleteFunction(id: string): void {
    const fn = this.getFunctionById(id);
    const functions = this.getFunctions().filter((f) => f.id !== id);
    this.save(STORAGE_KEYS.FUNCTIONS, functions);

    // Unlink function from volunteers
    const people = this.getPeople().map((p) => ({
      ...p,
      functionPreferences: p.functionPreferences.filter((pref) => pref.functionId !== id)
    }));
    this.save(STORAGE_KEYS.PEOPLE, people);

    // Remove slots associated with this function in all schedules
    const schedules = this.getSchedules().map((sched) => ({
      ...sched,
      slots: sched.slots.filter((slot) => slot.functionId !== id)
    }));
    this.save(STORAGE_KEYS.SCHEDULES, schedules);

    if (fn) {
      this.addAuditLog('EXCLUSAO_FUNCAO', `Função ${fn.name} removida.`, 'FUNCTION');
    }
  }

  // --- People (Unified Single Volunteer Profile) ---
  getPeople(): Person[] {
    let people = this.load<Person[]>(STORAGE_KEYS.PEOPLE, INITIAL_PEOPLE);
    const filtered = people.filter((p) => !MOCK_PEOPLE_IDS.has(p.id));
    if (filtered.length !== people.length) {
      people = filtered;
      this.save(STORAGE_KEYS.PEOPLE, people);
    }
    return people;
  }

  getPersonById(id: string): Person | undefined {
    return this.getPeople().find((p) => p.id === id);
  }

  findPeopleByBirthDate(birthDate: string): Person[] {
    if (!birthDate) return [];
    const normalized = birthDate.trim();
    return this.getPeople().filter((p) => p.birthDate === normalized);
  }

  findPotentialNameDuplicates(name: string, excludeId?: string): Person[] {
    if (!name || name.trim().length < 3) return [];
    const term = name.trim().toLowerCase();
    return this.getPeople().filter((p) => {
      if (excludeId && p.id === excludeId) return false;
      const pName = p.name.toLowerCase();
      return pName.includes(term) || term.includes(pName) || (p.nickname && p.nickname.toLowerCase() === term);
    });
  }

  savePerson(person: Person): void {
    const people = this.getPeople();
    const idx = people.findIndex((p) => p.id === person.id);
    const updated: Person = idx >= 0
      ? { ...person, updatedAt: new Date().toISOString() }
      : {
          ...person,
          createdAt: person.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

    if (idx >= 0) {
      people[idx] = updated;
      this.addAuditLog('EDICAO_VOLUNTARIO', `Dados de ${person.name} atualizados.`, 'PERSON');
    } else {
      people.push(updated);
      this.addAuditLog('CADASTRO_VOLUNTARIO', `Novo voluntário cadastrado: ${person.name}.`, 'PERSON');
    }
    this.save(STORAGE_KEYS.PEOPLE, people);
  }

  deletePerson(id: string): void {
    const person = this.getPersonById(id);
    const people = this.getPeople().filter((p) => p.id !== id);
    this.save(STORAGE_KEYS.PEOPLE, people);

    // Clean up availability rules of this person
    const availabilities = this.getAvailabilities().filter((a) => a.personId !== id);
    this.save(STORAGE_KEYS.AVAILABILITIES, availabilities);

    // Clean up schedule assignments
    const schedules = this.getSchedules();
    let schedulesModified = false;
    schedules.forEach((sched) => {
      sched.slots?.forEach((slot) => {
        if (slot.assignedPersonId === id) {
          slot.assignedPersonId = undefined;
          slot.assignedPersonName = undefined;
          schedulesModified = true;
        }
      });
    });
    if (schedulesModified) {
      this.save(STORAGE_KEYS.SCHEDULES, schedules);
    }

    if (person) {
      this.addAuditLog('EXCLUSAO_VOLUNTARIO', `Voluntário ${person.name} excluído do sistema.`, 'PERSON');
    }
  }

  // --- Families ---
  getFamilies(): Family[] {
    let families = this.load<Family[]>(STORAGE_KEYS.FAMILIES, INITIAL_FAMILIES);
    const filtered = families.filter((f) => !MOCK_FAMILY_IDS.has(f.id));
    if (filtered.length !== families.length) {
      families = filtered;
      this.save(STORAGE_KEYS.FAMILIES, families);
    }
    return families;
  }

  getFamilyById(id: string): Family | undefined {
    return this.getFamilies().find((f) => f.id === id);
  }

  saveFamily(family: Family): void {
    const families = this.getFamilies();
    const idx = families.findIndex((f) => f.id === family.id);
    if (idx >= 0) {
      families[idx] = family;
      this.addAuditLog('EDICAO_FAMILIA', `Família ${family.name} atualizada.`, 'FAMILY');
    } else {
      families.push(family);
      this.addAuditLog('CRIACAO_FAMILIA', `Nova família criada: ${family.name}.`, 'FAMILY');
    }
    this.save(STORAGE_KEYS.FAMILIES, families);
  }

  deleteFamily(id: string): void {
    const fam = this.getFamilyById(id);
    const families = this.getFamilies().filter((f) => f.id !== id);
    this.save(STORAGE_KEYS.FAMILIES, families);
    // Unlink members
    const people = this.getPeople().map((p) => (p.familyId === id ? { ...p, familyId: undefined } : p));
    this.save(STORAGE_KEYS.PEOPLE, people);
    if (fam) {
      this.addAuditLog('EXCLUSAO_FAMILIA', `Família ${fam.name} excluída.`, 'FAMILY');
    }
  }

  getFamilyMembers(familyId: string): Person[] {
    return this.getPeople().filter((p) => p.familyId === familyId);
  }

  linkPersonsToFamily(person1Id: string, person2Id: string, customFamilyName?: string): Family {
    const p1 = this.getPersonById(person1Id);
    const p2 = this.getPersonById(person2Id);

    if (!p1 && !p2) {
      throw new Error('Pessoas não encontradas para o vínculo familiar.');
    }

    // If one person is still being created in memory (e.g. In wizard before initial save)
    if (!p1 || !p2) {
      const existing = p1 || p2!;
      let family: Family;
      if (existing.familyId) {
        family = this.getFamilyById(existing.familyId)!;
      } else {
        const lastName = existing.name.split(' ').slice(-1)[0] || 'Família';
        const famName = customFamilyName || `Família ${lastName}`;
        family = {
          id: `fam-${Date.now()}`,
          name: famName,
          priority: 'ALTA',
          createdAt: new Date().toISOString()
        };
        this.saveFamily(family);
        existing.familyId = family.id;
        this.savePerson(existing);
      }
      return family;
    }

    let family: Family;

    if (p1.familyId) {
      family = this.getFamilyById(p1.familyId)!;
      p2.familyId = family.id;
      this.savePerson(p2);
    } else if (p2.familyId) {
      family = this.getFamilyById(p2.familyId)!;
      p1.familyId = family.id;
      this.savePerson(p1);
    } else {
      // Auto create new family
      const lastName = p1.name.split(' ').slice(-1)[0] || 'Família';
      const famName = customFamilyName || `Família ${lastName}`;
      family = {
        id: `fam-${Date.now()}`,
        name: famName,
        priority: 'ALTA',
        createdAt: new Date().toISOString()
      };
      this.saveFamily(family);
      p1.familyId = family.id;
      p2.familyId = family.id;
      this.savePerson(p1);
      this.savePerson(p2);
    }

    this.addAuditLog(
      'VINCULO_FAMILIAR',
      `${p1.name} e ${p2.name} vinculados à ${family.name}.`,
      'FAMILY'
    );
    return family;
  }

  // --- Availability & Unavailability ---
  getAvailabilities(): AvailabilityRule[] {
    let avail = this.load<AvailabilityRule[]>(STORAGE_KEYS.AVAILABILITIES, INITIAL_AVAILABILITIES);
    const filtered = avail.filter((a) => !MOCK_PEOPLE_IDS.has(a.personId));
    if (filtered.length !== avail.length) {
      avail = filtered;
      this.save(STORAGE_KEYS.AVAILABILITIES, avail);
    }
    return avail;
  }

  getPersonAvailabilities(personId: string): AvailabilityRule[] {
    return this.getAvailabilities().filter((a) => a.personId === personId);
  }

  getAvailabilitiesByPerson(personId: string): AvailabilityRule[] {
    return this.getPersonAvailabilities(personId);
  }

  saveAvailability(rule: AvailabilityRule): void {
    const rules = this.getAvailabilities();
    const idx = rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = rule;
    } else {
      rules.push(rule);
    }
    this.save(STORAGE_KEYS.AVAILABILITIES, rules);
  }

  deleteAvailability(id: string): void {
    const rules = this.getAvailabilities().filter((r) => r.id !== id);
    this.save(STORAGE_KEYS.AVAILABILITIES, rules);
  }

  isPersonAvailable(personId: string, dateStr: string, shift: string = 'NOITE'): { available: boolean; reason?: string } {
    const rules = this.getPersonAvailabilities(personId);
    // Check specific date unavailability
    const specificUnavail = rules.find((r) => r.type === 'DATA_ESPECIFICA' && r.specificDate === dateStr && !r.isAvailable);
    if (specificUnavail) {
      return { available: false, reason: specificUnavail.reason || `Indisponível em ${dateStr}` };
    }

    // Check specific date availability override
    const specificAvail = rules.find((r) => r.type === 'DATA_ESPECIFICA' && r.specificDate === dateStr && r.isAvailable);
    if (specificAvail) {
      return { available: true };
    }

    // Parse date day of week (0=Sunday)
    const dateObj = new Date(dateStr + 'T12:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    // Check recurring unavailability
    const recurringUnavail = rules.find(
      (r) =>
        r.type === 'RECORRENTE' &&
        r.dayOfWeek === dayOfWeek &&
        (!r.shift || r.shift === 'AMBOS' || r.shift === 'QUALQUER' || r.shift.toLowerCase() === shift.toLowerCase()) &&
        !r.isAvailable
    );
    if (recurringUnavail) {
      return { available: false, reason: recurringUnavail.reason || 'Indisponibilidade recorrente' };
    }

    return { available: true };
  }

  // --- Conflict Detection ---
  // Scoped to the SAME micro: a volunteer can now serve in different micros on
  // the same date (e.g. Louvor then Professor), so only two roles inside one
  // micro on the same date are ever a conflict — and even then only when
  // they're not an explicitly compatible pair (see FunctionConflictGroup).
  checkSameMicroConflict(
    personId: string,
    microId: string,
    date: string,
    scheduleId: string,
    excludeSlotId?: string
  ): { hasConflict: boolean; conflictingSlot?: ScheduleSlot; conflictingFunction?: MicroFunction } {
    const schedules = this.getSchedules();
    for (const sched of schedules) {
      if (sched.status === 'CANCELADA') continue;
      for (const slot of sched.slots) {
        if (
          slot.microId === microId &&
          slot.date === date &&
          slot.assignedPersonId === personId &&
          slot.id !== excludeSlotId
        ) {
          const fn = this.getFunctionById(slot.functionId);
          return {
            hasConflict: true,
            conflictingSlot: slot,
            conflictingFunction: fn
          };
        }
      }
    }
    return { hasConflict: false };
  }

  // --- Schedules ---
  getSchedules(): Schedule[] {
    let schedules = this.load<Schedule[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
    const filtered = schedules.filter((s) => !MOCK_SCHEDULE_IDS.has(s.id));
    if (filtered.length !== schedules.length) {
      schedules = filtered;
      this.save(STORAGE_KEYS.SCHEDULES, schedules);
    }
    return schedules;
  }

  getScheduleById(id: string): Schedule | undefined {
    return this.getSchedules().find((s) => s.id === id);
  }

  saveSchedule(schedule: Schedule): void {
    const schedules = this.getSchedules();
    const idx = schedules.findIndex((s) => s.id === schedule.id);
    const currentUser = this.getCurrentUser();
    const updated = {
      ...schedule,
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      schedules[idx] = updated;
      this.addAuditLog('EDICAO_ESCALA', `Escala "${schedule.title}" atualizada (${schedule.status}).`, 'SCHEDULE');
    } else {
      schedules.push({
        ...updated,
        createdBy: currentUser.name,
        createdAt: new Date().toISOString()
      });
      this.addAuditLog('CRIACAO_ESCALA', `Nova escala criada: "${schedule.title}".`, 'SCHEDULE');
    }
    this.save(STORAGE_KEYS.SCHEDULES, schedules);
  }

  deleteSchedule(id: string): void {
    const sched = this.getScheduleById(id);
    const schedules = this.getSchedules().filter((s) => s.id !== id);
    this.save(STORAGE_KEYS.SCHEDULES, schedules);
    if (sched) {
      this.addAuditLog('EXCLUSAO_ESCALA', `Escala "${sched.title}" excluída.`, 'SCHEDULE');
    }
  }

  updateSlotAssignment(scheduleId: string, slotId: string, personId?: string, isManual = true): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;
    const slot = sched.slots.find((s) => s.id === slotId);
    if (!slot) return;

    if (personId) {
      const person = this.getPersonById(personId);
      slot.assignedPersonId = personId;
      slot.assignedPersonName = getScheduleDisplayName(person) || '';
      slot.manualOverride = isManual;
      // Record in audit log
      this.addAuditLog(
        'ATRIBUICAO_ESCALA',
        `${person?.name} atribuído à ${slot.sectionTitle || 'Função'} na data ${slot.date}.`,
        'SCHEDULE'
      );
    } else {
      slot.assignedPersonId = undefined;
      slot.assignedPersonName = undefined;
      slot.manualOverride = isManual;
      slot.score = undefined;
      slot.scoreBreakdown = undefined;
    }
    this.saveSchedule(sched);
  }

  // For functions marked allowsGuestEntry (e.g. "Participação Especial"): the
  // slot is filled with a typed name instead of a registered Person, so there
  // is no personId to store — assignedPersonName carries the guest's name.
  setSlotGuestName(scheduleId: string, slotId: string, guestName: string): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;
    const slot = sched.slots.find((s) => s.id === slotId);
    if (!slot) return;

    slot.assignedPersonId = undefined;
    slot.assignedPersonName = guestName.trim();
    slot.manualOverride = true;
    slot.score = undefined;
    slot.scoreBreakdown = undefined;
    this.addAuditLog(
      'ATRIBUICAO_ESCALA',
      `${slot.assignedPersonName} (convidado) atribuído à ${slot.sectionTitle || 'Função'} na data ${slot.date}.`,
      'SCHEDULE'
    );
    this.saveSchedule(sched);
  }

  addFunctionToSchedule(scheduleId: string, fn: MicroFunction): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;

    // Ensure micro is in schedule
    if (!sched.microIds.includes(fn.microId)) {
      sched.microIds.push(fn.microId);
    }

    const count = fn.defaultRequiredCount || 1;
    const newSlots: ScheduleSlot[] = [];

    for (let i = 1; i <= count; i++) {
      for (const date of sched.dates) {
        const slotId = `slot-${fn.microId}-${fn.id}-${date}-${i}`;
        // Only if not exists
        if (!sched.slots.some((s) => s.id === slotId)) {
          newSlots.push({
            id: slotId,
            scheduleId: sched.id,
            date,
            microId: fn.microId,
            functionId: fn.id,
            sectionTitle: fn.category || fn.name,
            slotIndex: i,
            manualOverride: false
          });
        }
      }
    }

    sched.slots = [...sched.slots, ...newSlots];
    this.saveSchedule(sched);
  }

  addExtraSlotToSchedule(scheduleId: string, functionId: string): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;
    const fn = this.getFunctions().find((f) => f.id === functionId);
    if (!fn) return;

    const existingSlotsForFn = sched.slots.filter((s) => s.functionId === functionId);
    const maxIndex = existingSlotsForFn.reduce((max, s) => Math.max(max, s.slotIndex || 1), 0);
    const nextIndex = maxIndex + 1;

    const newSlots: ScheduleSlot[] = [];
    for (const date of sched.dates) {
      const slotId = `slot-${fn.microId}-${fn.id}-${date}-${nextIndex}`;
      if (!sched.slots.some((s) => s.id === slotId)) {
        newSlots.push({
          id: slotId,
          scheduleId: sched.id,
          date,
          microId: fn.microId,
          functionId: fn.id,
          sectionTitle: fn.category || fn.name,
          slotIndex: nextIndex,
          manualOverride: false
        });
      }
    }

    sched.slots = [...sched.slots, ...newSlots];
    this.saveSchedule(sched);
  }

  removeFunctionFromSchedule(scheduleId: string, functionId: string): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;
    sched.slots = sched.slots.filter((s) => s.functionId !== functionId);
    this.saveSchedule(sched);
  }

  addMicroToSchedule(scheduleId: string, microId: string): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;
    if (!sched.microIds.includes(microId)) {
      sched.microIds.push(microId);
    }

    // Generate slots for micro's functions
    const microFunctions = this.getFunctionsByMicro(microId);
    const newSlots: ScheduleSlot[] = [];

    for (const fn of microFunctions) {
      const count = fn.defaultRequiredCount || 1;
      for (let i = 1; i <= count; i++) {
        for (const date of sched.dates) {
          const slotId = `slot-${microId}-${fn.id}-${date}-${i}`;
          if (!sched.slots.some((s) => s.id === slotId)) {
            newSlots.push({
              id: slotId,
              scheduleId: sched.id,
              date,
              microId,
              functionId: fn.id,
              sectionTitle: fn.category || fn.name,
              slotIndex: i,
              manualOverride: false
            });
          }
        }
      }
    }

    sched.slots = [...sched.slots, ...newSlots];
    this.saveSchedule(sched);
  }

  removeMicroFromSchedule(scheduleId: string, microId: string): void {
    const sched = this.getScheduleById(scheduleId);
    if (!sched) return;
    sched.microIds = sched.microIds.filter((mId) => mId !== microId);
    sched.slots = sched.slots.filter((s) => s.microId !== microId);
    this.saveSchedule(sched);
  }

  // --- Birthdays ---
  calculateBirthdays(): BirthdayNotification[] {
    const people = this.getPeople().filter((p) => p.active);
    const micros = this.getMicros();
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayMonth = today.getMonth(); // 0-11
    const todayDate = today.getDate();

    const notifications: BirthdayNotification[] = [];

    for (const p of people) {
      if (!p.birthDate) continue;
      const parts = p.birthDate.split('-');
      if (parts.length !== 3) continue;
      const bYear = parseInt(parts[0], 10);
      const bMonth = parseInt(parts[1], 10) - 1; // 0-11
      const bDay = parseInt(parts[2], 10);

      let nextBday = new Date(currentYear, bMonth, bDay);
      if (nextBday < new Date(currentYear, todayMonth, todayDate)) {
        nextBday = new Date(currentYear + 1, bMonth, bDay);
      }

      const diffTime = nextBday.getTime() - new Date(currentYear, todayMonth, todayDate).getTime();
      const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const ageTurning = nextBday.getFullYear() - bYear;

      let category: BirthdayNotification['category'] = 'OUTROS';
      if (daysRemaining === 0) category = 'HOJE';
      else if (daysRemaining === 1) category = 'AMANHA';
      else if (daysRemaining <= 7) category = 'PROXIMOS_7';
      else if (daysRemaining <= 30) category = 'PROXIMOS_30';
      else if (bMonth === todayMonth) category = 'ESTE_MES';

      const personMicros = p.microIds.map((mId) => micros.find((m) => m.id === mId)?.name || mId);

      notifications.push({
        personId: p.id,
        personName: p.name,
        birthDate: p.birthDate,
        nextBirthday: nextBday.toISOString().split('T')[0],
        ageTurning,
        daysRemaining,
        category,
        micros: personMicros,
        whatsapp: p.whatsapp,
        phone: p.phone
      });
    }

    return notifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // --- Audit Logs ---
  getAuditLogs(): AuditLog[] {
    return this.load<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  }

  addAuditLog(action: string, details: string, targetType: AuditLog['targetType']): void {
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      details,
      targetType
    };
    logs.unshift(newLog);
    if (logs.length > 300) logs.pop();
    this.save(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Rotation History ---
  getRotationHistory(): RotationHistoryItem[] {
    let history = this.load<RotationHistoryItem[]>(STORAGE_KEYS.ROTATION_HISTORY, INITIAL_ROTATION_HISTORY);
    const filtered = history.filter((h) => !MOCK_PEOPLE_IDS.has(h.personId) && !h.id.startsWith('rot-'));
    if (filtered.length !== history.length) {
      history = filtered;
      this.save(STORAGE_KEYS.ROTATION_HISTORY, history);
    }
    return history;
  }

  recordRotationHistory(items: RotationHistoryItem[]): void {
    const history = this.getRotationHistory();
    history.push(...items);
    this.save(STORAGE_KEYS.ROTATION_HISTORY, history);
  }

  // --- Supabase Cloud Sync & Export Helper ---
  getAllDataForExport() {
    return {
      users: this.getUsers(),
      micros: this.getMicros(),
      functions: this.getFunctions(),
      families: this.getFamilies(),
      people: this.getPeople(),
      availabilities: this.getAvailabilities(),
      schedules: this.getSchedules(),
      rotationHistory: this.getRotationHistory(),
      auditLogs: this.getAuditLogs()
    };
  }

  // Asks the server (admin-only) to pull the latest data from Supabase into its own
  // store, then refreshes this device from the server. Non-admins simply fall back
  // to a plain server refresh, since only the server holds Supabase credentials now.
  async syncWithSupabaseRemote(): Promise<boolean> {
    if (this.isSyncingSupabase) return false;
    this.isSyncingSupabase = true;
    try {
      const currentUser = this.getCurrentUser();
      if (currentUser.role === 'ADMIN_LIDERANCA') {
        await supabaseService.pullFromSupabase();
      }
      const changed = await this.pullFromServer(true);
      if (changed && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mevam_data_synced', { detail: { source: 'supabase' } }));
      }
      return true;
    } catch (e) {
      console.warn('Sync with remote Supabase failed:', e);
      return false;
    } finally {
      this.isSyncingSupabase = false;
    }
  }

  // --- Reset to Clean Zero State ---
  async resetAllData(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.MICROS);
    localStorage.removeItem(STORAGE_KEYS.FUNCTIONS);
    localStorage.removeItem(STORAGE_KEYS.FAMILIES);
    localStorage.removeItem(STORAGE_KEYS.PEOPLE);
    localStorage.removeItem(STORAGE_KEYS.AVAILABILITIES);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.ROTATION_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);

    this.save(STORAGE_KEYS.USERS, INITIAL_USERS, false);
    this.save(STORAGE_KEYS.MICROS, [], false);
    this.save(STORAGE_KEYS.FUNCTIONS, [], false);
    this.save(STORAGE_KEYS.FAMILIES, [], false);
    this.save(STORAGE_KEYS.PEOPLE, [], false);
    this.save(STORAGE_KEYS.AVAILABILITIES, [], false);
    this.save(STORAGE_KEYS.SCHEDULES, [], false);
    this.save(STORAGE_KEYS.ROTATION_HISTORY, [], false);
    this.save(STORAGE_KEYS.AUDIT_LOGS, [], false);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'user-admin');

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/reset', { method: 'POST', headers: this.authHeaders() });
      } catch (e) {
        console.warn('API reset call failed:', e);
      }
      window.dispatchEvent(new CustomEvent('mevam_data_synced', { detail: { source: 'reset' } }));
    }
  }
}

export const storageService = new StorageService();
