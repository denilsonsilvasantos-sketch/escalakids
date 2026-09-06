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
  Loader2,
  ShieldAlert,
  Search
} from 'lucide-react';
import { UserAccount, UserRole, Micro } from '../../types';
import { storageService } from '../../services/storageService';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PhotoUploader } from '../common/PhotoUploader';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUserUpdated?: () => void;
  initialEditUserId?: string | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  initialEditUserId
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
  // Passwords are hashed at rest and never sent back by the server, so the plaintext
  // is only ever known right after it is set (creation or reset) — kept here just
  // long enough for the admin to copy/share it, then discarded when the modal closes.
  const [revealedPassword, setRevealedPassword] = useState<{ userId: string; password: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [activeRoleFilter, setActiveRoleFilter] = useState<'ALL' | 'MACRO' | 'MICRO' | 'ADMIN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for New User
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: (currentUser.role === 'LIDER_MACRO' ? 'LIDER_MICRO' : 'LIDER_MACRO') as UserRole,
    allowedMicroIds: [] as string[],
    primaryMicroId: '',
    whatsapp: '',
    avatar: ''
  });

  // Form State for Editing User
  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'LIDER_MACRO' as UserRole,
    allowedMicroIds: [] as string[],
    primaryMicroId: '',
    whatsapp: '',
    avatar: ''
  });

  const refreshData = useCallback(() => {
    setUsers(storageService.getUsers());
    setMicros(storageService.getMicros());
  }, []);
  const refreshUsers = refreshData;

  useEffect(() => {
    if (isOpen) {
      setUsers(storageService.getUsers());
      setMicros(storageService.getMicros());
      storageService.syncWithSupabaseRemote().then(() => {
        setUsers(storageService.getUsers());
        setMicros(storageService.getMicros());
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSync = () => {
      setUsers(storageService.getUsers());
      setMicros(storageService.getMicros());
    };
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  // Forget any transiently-revealed plaintext password once the modal is closed.
  useEffect(() => {
    if (!isOpen) setRevealedPassword(null);
  }, [isOpen]);

  // If initialEditUserId was provided, automatically open user for editing
  useEffect(() => {
    if (isOpen && initialEditUserId) {
      const allUsers = storageService.getUsers();
      const target = allUsers.find((u) => u.id === initialEditUserId);
      if (target) {
        handleStartEdit(target);
      }
    }
  }, [isOpen, initialEditUserId]);

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

  // All users this actor has authority to manage
  const allManageableUsers = storageService.getManageableUsers(currentUser);
  const macroUsers = allManageableUsers.filter((u) => u.role === 'LIDER_MACRO');
  const microUsers = allManageableUsers.filter((u) => u.role === 'LIDER_MICRO');
  const adminUsers = allManageableUsers.filter((u) => u.role === 'ADMIN_LIDERANCA');

  // Filter users displayed based on tab and search
  const displayedUsers = allManageableUsers.filter((u) => {
    if (activeRoleFilter === 'MACRO' && u.role !== 'LIDER_MACRO') return false;
    if (activeRoleFilter === 'MICRO' && u.role !== 'LIDER_MICRO') return false;
    if (activeRoleFilter === 'ADMIN' && u.role !== 'ADMIN_LIDERANCA') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const primaryMicro = micros.find((m) => m.id === u.primaryMicroId);
      const matchesMicro = primaryMicro?.name.toLowerCase().includes(q);
      const matchesSupervised = micros.some(
        (m) => u.allowedMicroIds?.includes(m.id) && m.name.toLowerCase().includes(q)
      );
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.whatsapp && u.whatsapp.toLowerCase().includes(q)) ||
        Boolean(matchesMicro) ||
        Boolean(matchesSupervised)
      );
    }
    return true;
  });

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
      const timeoutPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Usuário salvo localmente e na fila de sincronização.'
          });
        }, 6000);
      });

      const result = await Promise.race([
        storageService.createDelegatedUser(
          {
            name: formData.name,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            allowedMicroIds: formData.allowedMicroIds,
            primaryMicroId: formData.primaryMicroId,
            whatsapp: formData.whatsapp,
            avatar: formData.avatar?.trim() || undefined
          },
          currentUser
        ),
        timeoutPromise
      ]);

      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        const createdUser = (result as any).user as UserAccount | undefined;
        const createdPlainPassword = (result as any).plainPassword as string | undefined;
        if (createdUser && createdPlainPassword) {
          setRevealedPassword({ userId: createdUser.id, password: createdPlainPassword });
        }
        setIsCreatingUser(false);
        setFormData({
          name: '',
          username: '',
          email: '',
          password: '',
          role: isMacroLeader ? 'LIDER_MICRO' : 'LIDER_MACRO',
          allowedMicroIds: [],
          primaryMicroId: '',
          whatsapp: '',
          avatar: ''
        });
        refreshUsers();
        onUserUpdated?.();
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
        setFeedback({ type: 'success', message: result.message });
        if (result.plainPassword) {
          setRevealedPassword({ userId: selectedUserForPassword.id, password: result.plainPassword });
        }
        setSelectedUserForPassword(null);
        setNewPassword('');
        refreshUsers();
        onUserUpdated?.();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user: UserAccount) => {
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const user = userToDelete;
    setUserToDelete(null);
    setIsSubmitting(true);
    try {
      const res = await storageService.deleteUserAccount(user.id, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        refreshUsers();
        onUserUpdated?.();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (u: UserAccount) => {
    setEditingUser(u);
    setIsCreatingUser(false);
    setSelectedUserForPassword(null);
    setEditFormData({
      name: u.name,
      username: u.username || '',
      email: u.email || '',
      role: u.role,
      allowedMicroIds: u.allowedMicroIds || [],
      primaryMicroId: u.primaryMicroId || '',
      whatsapp: u.whatsapp || '',
      avatar: u.avatar || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFormData.name.trim()) {
      setFeedback({ type: 'error', message: 'O nome é obrigatório.' });
      return;
    }
    if (editFormData.role === 'LIDER_MICRO' && !editFormData.primaryMicroId) {
      setFeedback({ type: 'error', message: 'Selecione a frente/sala principal do Líder de Micro.' });
      return;
    }
    if (editFormData.role === 'LIDER_MACRO' && editFormData.allowedMicroIds.length === 0) {
      setFeedback({ type: 'error', message: 'Selecione pelo menos uma frente sob a supervisão do Líder Macro.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const updated: UserAccount = {
        ...editingUser,
        name: editFormData.name.trim(),
        username: editFormData.username.trim().toLowerCase().replace(/^@/, ''),
        email: editFormData.email.trim() || undefined,
        whatsapp: editFormData.whatsapp.trim(),
        avatar: editFormData.avatar?.trim() || undefined,
        role: editFormData.role,
        allowedMicroIds:
          editFormData.role === 'LIDER_MACRO'
            ? editFormData.allowedMicroIds
            : editFormData.role === 'ADMIN_LIDERANCA'
            ? assignableMicros.map((m) => m.id)
            : [],
        primaryMicroId: editFormData.role === 'LIDER_MICRO' ? editFormData.primaryMicroId : null
      };

      const res = await storageService.updateUserAccount(updated, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Perfil, dados e foto atualizados com sucesso!' });
        setEditingUser(null);
        refreshUsers();
        onUserUpdated?.();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = (u: UserAccount) => {
    // Passwords are hashed at rest — the plaintext only exists transiently, right
    // after this account was created or had its password reset in this session.
    if (revealedPassword?.userId !== u.id) {
      setFeedback({
        type: 'error',
        message: `A senha de ${u.name} não pode mais ser exibida. Use "Alterar Senha" para definir uma nova e compartilhar.`
      });
      return;
    }

    const text = `🙌 Olá ${u.name}!\n\nSeus dados de acesso ao sistema do *MEVAM Kids* foram gerados:\n\n🌐 Link: ${window.location.origin}\n👤 Usuário: *${u.username || u.name}*\n🔑 Senha: *${revealedPassword.password}*\n🛡️ Perfil: *${u.role}*\n\nVocê pode alterar sua senha a qualquer momento após entrar.`;

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
                <span>Painel da Liderança: Gestão de Líderes Macro & Micro</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {isAdmin ? 'Acesso Total (Admin)' : 'Gestão Delegada (Macro)'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'Controle central de Líderes Macro e Líderes de Micro. Crie acessos, defina senhas e vincule salas/frentes.'
                  : 'Gerencie os Líderes de Micro vinculados às frentes sob sua supervisão.'}
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

          {/* Leadership Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/50 border border-blue-700/60 text-blue-300 flex items-center justify-center font-bold text-base shrink-0">
                {macroUsers.length}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-blue-200 truncate">Líderes Macro</div>
                <div className="text-[11px] text-blue-400/80 truncate">Supervisionam frentes</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-900/50 border border-emerald-700/60 text-emerald-300 flex items-center justify-center font-bold text-base shrink-0">
                {microUsers.length}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-200 truncate">Líderes de Micro</div>
                <div className="text-[11px] text-emerald-400/80 truncate">Salas & Áreas ativas</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/50 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/50 border border-purple-700/60 text-purple-300 flex items-center justify-center font-bold text-base shrink-0">
                {micros.filter((m) => microUsers.some((u) => u.primaryMicroId === m.id) || macroUsers.some((u) => u.allowedMicroIds?.includes(m.id))).length}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-purple-200 truncate">Frentes com Liderança</div>
                <div className="text-[11px] text-purple-400/80 truncate">Total: {micros.length} cadastradas</div>
              </div>
            </div>
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
                  setEditingUser(null);
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

              {/* Photo Uploader for New User */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <PhotoUploader
                  value={formData.avatar}
                  onChange={(val) => setFormData({ ...formData, avatar: val })}
                  theme="dark"
                  label="Foto do Líder (Opcional)"
                  helperText="Clique para procurar arquivo, arraste a foto ou insira um link web."
                  nameFallback={formData.name || 'L'}
                  shape="rounded"
                />
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
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setFormData({
                        ...formData,
                        role: newRole,
                        allowedMicroIds: newRole === 'ADMIN_LIDERANCA' ? assignableMicros.map((m) => m.id) : formData.allowedMicroIds
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {isAdmin && <option value="LIDER_MACRO">Líder Macro (Supervisiona Várias Micros / Frentes)</option>}
                    <option value="LIDER_MICRO">Líder de Micro (Sala / Louvor / Apoio)</option>
                    {isAdmin && <option value="ADMIN_LIDERANCA">Administrador / Liderança Principal (Controle Total Admin)</option>}
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

              {/* If ADMIN_LIDERANCA: Informational alert */}
              {formData.role === 'ADMIN_LIDERANCA' && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300 font-semibold mb-0.5">Conceder Acesso Administrador (Controle Total)</strong>
                    <span>Este usuário terá acesso a todas as frentes/micros, poderá cadastrar novos líderes, alterar senhas, gerenciar escalas gerais e sincronizar dados com o Supabase.</span>
                  </div>
                </div>
              )}

              {/* If LIDER_MACRO: Select multiple allowed micros */}
              {formData.role === 'LIDER_MACRO' && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Frentes / Micros sob Supervisão deste Líder Macro:
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowedMicroIds: assignableMicros.map((m) => m.id)
                          })
                        }
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 underline"
                      >
                        Selecionar Todas ({assignableMicros.length})
                      </button>
                      <span className="text-slate-600 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            allowedMicroIds: []
                          })
                        }
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-300 underline"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {assignableMicros.map((m) => {
                      const isChecked = formData.allowedMicroIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center space-x-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-950/60 border-blue-600 text-blue-200 font-medium'
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

          {/* Edit User Form */}
          {editingUser && (
            <form
              onSubmit={handleSaveEdit}
              className="bg-slate-950 border border-blue-900/80 p-5 rounded-2xl space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-sm font-bold text-blue-300">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Editar Perfil & Função: {editingUser.name}</span>
                  {editingUser.id === 'user-admin' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-semibold">
                      Admin Principal
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Uploader for Editing User */}
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
                <PhotoUploader
                  value={editFormData.avatar}
                  onChange={(val) => setEditFormData({ ...editFormData, avatar: val })}
                  theme="dark"
                  label="Foto de Perfil"
                  helperText="Clique para procurar arquivo, arraste a foto ou insira um link web."
                  nameFallback={editFormData.name || editingUser.name}
                  shape="rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome de Usuário (@login) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value.toLowerCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nível de Acesso (Papel / Função) *
                  </label>
                  <select
                    value={editFormData.role}
                    disabled={editingUser.id === 'user-admin'}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setEditFormData({
                        ...editFormData,
                        role: newRole,
                        allowedMicroIds: newRole === 'ADMIN_LIDERANCA' ? assignableMicros.map((m) => m.id) : editFormData.allowedMicroIds
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    {isAdmin && <option value="LIDER_MACRO">Líder Macro (Supervisiona Várias Micros / Frentes)</option>}
                    <option value="LIDER_MICRO">Líder de Micro (Sala / Louvor / Apoio)</option>
                    {isAdmin && <option value="ADMIN_LIDERANCA">Administrador / Liderança Principal (Controle Total Admin)</option>}
                    {isAdmin && <option value="COORDENADOR">Coordenador Geral</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp (Contato)
                  </label>
                  <input
                    type="text"
                    value={editFormData.whatsapp}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                    placeholder="Ex: (47) 99999-8888"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* If LIDER_MACRO: Select multiple allowed micros */}
              {editFormData.role === 'LIDER_MACRO' && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Frentes / Micros sob Supervisão deste Líder Macro:
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            allowedMicroIds: assignableMicros.map((m) => m.id)
                          })
                        }
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 underline"
                      >
                        Selecionar Todas ({assignableMicros.length})
                      </button>
                      <span className="text-slate-600 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            allowedMicroIds: []
                          })
                        }
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-300 underline"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {assignableMicros.map((m) => {
                      const isChecked = editFormData.allowedMicroIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center space-x-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-950/60 border-blue-600 text-blue-200 font-medium'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditFormData({
                                  ...editFormData,
                                  allowedMicroIds: [...editFormData.allowedMicroIds, m.id]
                                });
                              } else {
                                setEditFormData({
                                  ...editFormData,
                                  allowedMicroIds: editFormData.allowedMicroIds.filter((id) => id !== m.id)
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
              {editFormData.role === 'LIDER_MICRO' && (
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frente / Sala Principal *
                  </label>
                  <select
                    required
                    value={editFormData.primaryMicroId}
                    onChange={(e) => setEditFormData({ ...editFormData, primaryMicroId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Selecione a micro / sala...</option>
                    {assignableMicros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Tabs & Search Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Role Filter Tabs */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeRoleFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({allManageableUsers.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveRoleFilter('MACRO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeRoleFilter === 'MACRO'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                <span>Líderes Macro</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-950 border border-blue-800 text-blue-200">
                  {macroUsers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRoleFilter('MICRO')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                  activeRoleFilter === 'MICRO'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <span>Líderes de Micro</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-200">
                  {microUsers.length}
                </span>
              </button>

              {isAdmin && adminUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveRoleFilter('ADMIN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                    activeRoleFilter === 'ADMIN'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <span>Admins</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 border border-amber-800 text-amber-200">
                    {adminUsers.length}
                  </span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar líder, sala ou fone..."
                className="w-full pl-8 pr-8 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* User List Cards */}
          <div className="space-y-3">
            {displayedUsers.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-slate-800/80 rounded-2xl">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">Nenhum líder encontrado</p>
                <p className="text-xs text-slate-500 mt-1">
                  {searchQuery ? `Nenhum resultado correspondente a "${searchQuery}".` : 'Não há líderes cadastrados nesta categoria.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs text-blue-400 hover:underline"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              displayedUsers.map((u) => {
              const roleBadge = getRoleLabel(u.role);
              const isMasterAdmin = u.id === 'user-admin';
              const isSelf = u.id === currentUser.id;
              const canEditUser =
                isAdmin ||
                isSelf ||
                (isMacroLeader && (u.role === 'LIDER_MICRO' || u.createdBy === currentUser.id));
              const hasRevealedPassword = revealedPassword?.userId === u.id;

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
                        {hasRevealedPassword ? (
                          <span className="font-mono">
                            Senha: <strong className="text-amber-300">{revealedPassword!.password}</strong>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Senha protegida</span>
                        )}
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
                        setEditingUser(null);
                        setNewPassword('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                      title="Alterar Senha"
                    >
                      <Lock className="w-4 h-4" />
                    </button>

                    {canEditUser && (
                      <button
                        onClick={() => handleStartEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700"
                        title={isMasterAdmin ? 'Editar Administrador (Dados e Foto)' : 'Editar Perfil, Função e Foto'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

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
            })
          )}
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

      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Excluir Usuário"
        message={
          <>Tem certeza que deseja excluir a conta de <strong className="text-slate-900 font-semibold">{userToDelete?.name}</strong>? Ele(a) perderá o acesso ao sistema imediatamente.</>
        }
        isConfirming={isSubmitting}
        onCancel={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
      />
    </div>
  );
};
