import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Shield,
  UserPlus,
  KeyRound,
  Users,
  Check,
  Copy,
  Trash2,
  Edit2,
  Lock,
  Layers,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { UserAccount, UserRole, Micro } from '../../types';
import { storageService } from '../../services/storageService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUserUpdated?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated
}) => {
  const [users, setUsers] = useState<UserAccount[]>(storageService.getUsers());
  const [micros, setMicros] = useState<Micro[]>(storageService.getMicros());
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);

  // Form State for New User
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: (currentUser.role === 'LIDER_MACRO' ? 'LIDER_MICRO' : 'LIDER_MACRO') as UserRole,
    allowedMicroIds: [] as string[],
    primaryMicroId: '',
    whatsapp: ''
  });

  const refreshData = useCallback(() => {
    setUsers(storageService.getUsers());
    setMicros(storageService.getMicros());
    onUserUpdated?.();
  }, [onUserUpdated]);
  const refreshUsers = refreshData;

  useEffect(() => {
    if (isOpen) {
      refreshData();
      storageService.syncWithSupabaseRemote().then(() => refreshData());
    }
  }, [isOpen, refreshData]);

  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, [refreshData]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsCheckingCloud(true);
    setFeedback({ type: 'success', message: 'Sincronizando com a Nuvem MEVAM Kids...' });
    const ok = await storageService.syncWithSupabaseRemote();
    setIsCheckingCloud(false);
    if (ok) {
      setFeedback({ type: 'success', message: 'Dados e líderes atualizados da nuvem com sucesso!' });
      refreshData();
    } else {
      setFeedback({ type: 'error', message: 'Falha ao buscar dados da nuvem. Verifique a conexão.' });
    }
  };

  const isAdmin = currentUser.role === 'ADMIN_LIDERANCA';
  const isMacroLeader = currentUser.role === 'LIDER_MACRO';

  // Allowed micros to supervise/assign - deduplicated and strictly active
  const assignableMicros = (isAdmin
    ? micros
    : micros.filter((m) => currentUser.allowedMicroIds?.includes(m.id))
  ).filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx);

  // Filter users displayed based on hierarchy
  const displayedUsers = storageService.getManageableUsers(currentUser);

  const handleNameChange = (name: string) => {
    const firstName = name
      .trim()
      .split(' ')[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    setFormData((prev) => ({
      ...prev,
      name,
      username: prev.username || firstName,
      password: prev.password || (firstName ? `${firstName}123` : '')
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await storageService.createDelegatedUser(
        {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          allowedMicroIds: formData.allowedMicroIds,
          primaryMicroId: formData.primaryMicroId,
          whatsapp: formData.whatsapp
        },
        currentUser
      );

      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        setIsCreatingUser(false);
        setFormData({
          name: '',
          username: '',
          email: '',
          password: '',
          role: isMacroLeader ? 'LIDER_MICRO' : 'LIDER_MACRO',
          allowedMicroIds: [],
          primaryMicroId: '',
          whatsapp: ''
        });
        refreshUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Erro ao cadastrar líder: ${err?.message || 'Falha desconhecida'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setIsSubmitting(true);

    try {
      const result = await storageService.updateUserPassword(
        selectedUserForPassword.id,
        newPassword,
        currentUser
      );

      if (result.success) {
        setFeedback({
          type: result.supabaseSynced === false ? 'error' : 'success',
          message: result.message
        });
        setSelectedUserForPassword(null);
        setNewPassword('');
        refreshUsers();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (confirm(`Tem certeza que deseja excluir a conta de "${user.name}"?`)) {
      setIsSubmitting(true);
      try {
        const res = await storageService.deleteUserAccount(user.id, currentUser);
        if (res.success) {
          setFeedback({ type: 'success', message: res.message });
          refreshUsers();
        } else {
          setFeedback({ type: 'error', message: res.message });
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCopyCredentials = (u: UserAccount) => {
    const userPass = u.password || (u.role === 'ADMIN_LIDERANCA' ? 'ADMIN' : '123');
    const text = `🙌 Olá ${u.name}!\n\nSeus dados de acesso ao sistema do *MEVAM Kids* foram gerados:\n\n🌐 Link: ${window.location.origin}\n👤 Usuário: *${u.username || u.name}*\n🔑 Senha: *${userPass}*\n🛡️ Perfil: *${u.role}*\n\nVocê pode alterar sua senha a qualquer momento após entrar.`;

    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN_LIDERANCA':
        return { label: 'Liderança Principal (Admin)', bg: 'bg-amber-950/80 text-amber-300 border-amber-800' };
      case 'LIDER_MACRO':
        return { label: 'Líder Macro (Frentes)', bg: 'bg-blue-950/80 text-blue-300 border-blue-800' };
      case 'LIDER_MICRO':
        return { label: 'Líder de Micro (Sala/Área)', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
      case 'COORDENADOR':
        return { label: 'Coordenador Geral', bg: 'bg-purple-950/80 text-purple-300 border-purple-800' };
      case 'VOLUNTARIO':
        return { label: 'Voluntário', bg: 'bg-teal-950/80 text-teal-300 border-teal-800' };
      default:
        return { label: role, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>Gestão de Usuários & Acessos</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {isAdmin ? 'Controle Total (Admin)' : 'Controle Delegado (Macro)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'ADMIN cria Líderes Macros com primeiro nome e senha. Líderes alteram senhas.'
                  : 'Crie e gerencie os Líderes das Micros sob sua supervisão.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-3 border-b text-xs font-semibold flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border-rose-800 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Cloud Database Diagnostic & Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-300">Sincronização em Tempo Real Ativa</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Qualquer alteração ou novo líder aparece automaticamente em todos os celulares e computadores</span>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isCheckingCloud}
              className="flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors self-start sm:self-auto shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCloud ? 'animate-spin' : ''}`} />
              <span>Sincronizar Agora</span>
            </button>
          </div>

          {/* Top Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {isCreatingUser ? 'Novo Cadastro de Líder' : 'Líderes & Contas Ativas'}
              </h3>
              <p className="text-xs text-slate-400">
                {isCreatingUser
                  ? 'Preencha o primeiro nome, defina a senha inicial e vincule as frentes.'
                  : `${displayedUsers.length} usuário(s) sob sua gestão.`}
              </p>
            </div>
            {(isAdmin || isMacroLeader) && (
              <button
                onClick={() => {
                  setIsCreatingUser(!isCreatingUser);
                  setSelectedUserForPassword(null);
                }}
                className="flex items-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 self-start sm:self-auto"
              >
                {isCreatingUser ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {isAdmin ? 'Criar Líder Macro / Micro' : 'Criar Líder de Micro'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Creation Form (Collapsible) */}
          {isCreatingUser && (
            <form
              onSubmit={handleCreateUser}
              className="bg-slate-950 border border-blue-900/40 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center space-x-2 text-sm font-bold text-blue-300 pb-2 border-b border-slate-800">
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAdmin
                    ? 'ADMIN: Cadastrar Novo Líder com Primeiro Nome e Senha'
                    : 'Líder Macro: Cadastrar Líder de Micro'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo do Líder *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Usuário de Acesso (Primeiro Nome) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    placeholder="Ex: joao"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha Inicial * (Alterável pelo Líder)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Ex: joao123"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nível de Acesso (Papel) *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {isAdmin && <option value="LIDER_MACRO">Líder Macro (Supervisiona Várias Micros)</option>}
                    <option value="LIDER_MICRO">Líder de Micro (Sala / Louvor / Apoio)</option>
                    {isAdmin && <option value="COORDENADOR">Coordenador Geral</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp (Opcional - para envio de convite)
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Ex: (47) 99999-8888"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* If LIDER_MACRO: Select multiple allowed micros */}
              {formData.role === 'LIDER_MACRO' && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Frentes / Micros sob Supervisão deste Líder Macro:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {assignableMicros.map((m) => {
                      const isChecked = formData.allowedMicroIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center space-x-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  allowedMicroIds: [...formData.allowedMicroIds, m.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  allowedMicroIds: formData.allowedMicroIds.filter((id) => id !== m.id)
                                });
                              }
                            }}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If LIDER_MICRO: Select primary micro */}
              {formData.role === 'LIDER_MICRO' && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Micro / Frente Principal *
                  </label>
                  <select
                    required
                    value={formData.primaryMicroId}
                    onChange={(e) => setFormData({ ...formData, primaryMicroId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Selecione a Micro / Sala...</option>
                    {assignableMicros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreatingUser(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando e Sincronizando...</span>
                    </>
                  ) : (
                    <span>Salvar e Conceder Acesso</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Change Password Sub-modal */}
          {selectedUserForPassword && (
            <form
              onSubmit={handleUpdatePassword}
              className="bg-slate-950 border border-amber-900/60 p-5 rounded-2xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
                  <Lock className="w-4 h-4" />
                  <span>Alterar Senha de {selectedUserForPassword.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nova Senha * (Mínimo 3 caracteres)
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Informe a nova senha desejada"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedUserForPassword(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-slate-950 disabled:text-amber-300 text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isSubmitting ? 'Atualizando...' : 'Atualizar Senha'}</span>
                </button>
              </div>
            </form>
          )}

          {/* User List Cards */}
          <div className="space-y-3">
            {displayedUsers.map((u) => {
              const roleBadge = getRoleLabel(u.role);
              const isMasterAdmin = u.id === 'user-admin';
              const userPassword = u.password || (isMasterAdmin ? 'ADMIN' : '123');

              // Linked micro names
              const primaryMicro = micros.find((m) => m.id === u.primaryMicroId);
              const allowedMicroNames = micros
                .filter((m) => u.allowedMicroIds?.includes(m.id))
                .map((m) => m.name);

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isMasterAdmin
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 font-bold text-sm text-slate-200 flex items-center justify-center shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        u.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-bold text-slate-100">{u.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center space-x-3 text-xs text-slate-400 flex-wrap gap-y-1">
                        <span className="font-mono">
                          Usuário: <strong className="text-slate-200">{u.username || 'admin'}</strong>
                        </span>
                        <span className="font-mono">
                          Senha: <strong className="text-amber-300">{userPassword}</strong>
                        </span>
                        {u.createdByName && (
                          <span className="text-[11px] text-slate-400">
                            Criado por: {u.createdByName}
                          </span>
                        )}
                      </div>

                      {/* Scoped Micros Badges */}
                      {u.role === 'LIDER_MACRO' && allowedMicroNames.length > 0 && (
                        <div className="mt-2 flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[11px] text-blue-400 font-semibold flex items-center space-x-1">
                            <Layers className="w-3 h-3" />
                            <span>Supervisiona:</span>
                          </span>
                          {allowedMicroNames.map((name) => (
                            <span
                              key={name}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}

                      {u.role === 'LIDER_MICRO' && primaryMicro && (
                        <div className="mt-1.5">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold">
                            Frente: {primaryMicro.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleCopyCredentials(u)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        copiedId === u.id
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                      title="Copiar dados para enviar pelo WhatsApp"
                    >
                      {copiedId === u.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === u.id ? 'Copiado!' : 'Copiar Acesso'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedUserForPassword(u);
                        setIsCreatingUser(false);
                        setNewPassword('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                      title="Alterar Senha"
                    >
                      <Lock className="w-4 h-4" />
                    </button>

                    {isAdmin && !isMasterAdmin && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>MEVAM Kids • Gestão de Acessos e Hierarquia</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
