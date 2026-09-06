import React, { useState, useEffect } from 'react';
import {
  Search,
  Cake,
  Shield,
  RefreshCw,
  ChevronDown,
  Users,
  KeyRound,
  LogOut,
  Layers,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { UserAccount, SupabaseSyncState } from '../../types';
import { storageService } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface HeaderProps {
  currentUser: UserAccount;
  onUserChange?: (user: UserAccount) => void;
  onOpenGlobalSearch: () => void;
  onNavigate: (view: string) => void;
  onResetData: () => void;
  onOpenSupabaseModal: () => void;
  onOpenUserManagement: (targetUserId?: string) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenGlobalSearch,
  onNavigate,
  onResetData,
  onOpenSupabaseModal,
  onOpenUserManagement,
  onLogout,
  onToggleMobileMenu
}) => {
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [syncState, setSyncState] = useState<SupabaseSyncState>(supabaseService.getSyncState());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN_LIDERANCA';
  const isMacroLeader = currentUser.role === 'LIDER_MACRO';
  const isMicroLeader = currentUser.role === 'LIDER_MICRO';

  useEffect(() => {
    const bdays = storageService.calculateBirthdays();
    const upcoming = bdays.filter((b) => b.category === 'HOJE' || b.category === 'AMANHA' || b.category === 'PROXIMOS_7');
    setBirthdayCount(upcoming.length);

    const unsub = supabaseService.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, [currentUser]);

  const micros = storageService.getMicros();
  const supervisedMicros = micros.filter((m) => currentUser.allowedMicroIds?.includes(m.id));
  const primaryMicro = micros.find((m) => m.id === currentUser.primaryMicroId);

  const getRoleBadge = (role: string) => {
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
      case 'OBSERVADOR':
        return { label: 'Observador', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
      default:
        return { label: 'Voluntário', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const badge = getRoleBadge(currentUser.role);

  return (
    <>
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* px-4 matches the sidebar's own p-4 (see Sidebar.tsx), so the logo lines
          up exactly with the sidebar's left edge below it instead of floating
          in a separately-centered column. */}
      <div className="px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="cursor-pointer" onClick={() => onNavigate('dashboard')}>
              <div className="flex items-center space-x-2">
                <img
                  src="/mevam-kids-logo.png"
                  alt="MEVAM Kids"
                  className="h-8 sm:h-9 w-auto shrink-0"
                />
                <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/80 rounded-md uppercase tracking-wider">
                  Escalas Pro
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400 font-medium mt-0.5">
                Gestão Unificada de Voluntários & Escalas
              </p>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-sm lg:max-w-md mx-3 lg:mx-6 min-w-0 hidden md:block">
            <button
              type="button"
              onClick={onOpenGlobalSearch}
              className="w-full h-9 flex items-center justify-between px-3 text-xs text-slate-400 bg-slate-800/80 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-all border border-slate-700/70 hover:border-slate-600 shadow-inner group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
              title="Buscar voluntários, micros, escalas ou funções (⌘K / Ctrl+K)"
            >
              <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors shrink-0" />
                <span className="truncate whitespace-nowrap text-slate-400 group-hover:text-slate-200 font-medium text-xs">
                  Buscar no MEVAM Kids...
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-900/90 border border-slate-700/90 rounded-md shrink-0 ml-2 group-hover:border-slate-600 group-hover:text-slate-300">
                <span>⌘K</span>
              </kbd>
            </button>
          </div>

          {/* Right Action Icons & Role Switcher */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Unified Sync Status Badge — for admins it's clickable and opens the
                cloud sync panel; for everyone else it's just a status indicator.
                (Access management already lives in the profile dropdown below,
                so it isn't duplicated here as a separate button.) */}
            {isAdmin ? (
              <button
                onClick={onOpenSupabaseModal}
                className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0 ${
                  syncState.isConnected
                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title="Sincronização em tempo real entre dispositivos e nuvem MEVAM Kids"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${syncState.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="hidden lg:inline">
                  {syncState.isConnected ? 'Nuvem Conectada' : 'Sincronizar Nuvem'}
                </span>
                <span className="lg:hidden">Nuvem</span>
              </button>
            ) : (
              <div
                className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 text-xs font-medium shrink-0"
                title="Sincronização em tempo real ativa: dados unificados em todos os celulares, tablets e computadores."
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="hidden lg:inline">Sincronizado</span>
              </div>
            )}

            {/* Mobile Search Button */}
            <button
              onClick={onOpenGlobalSearch}
              className="p-2 text-slate-400 hover:text-white md:hidden rounded-lg hover:bg-slate-800"
              aria-label="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Birthday Alert Button */}
            <button
              onClick={() => onNavigate('birthdays')}
              className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              title="Aniversários Próximos"
            >
              <Cake className="w-5 h-5 text-rose-400" />
              {birthdayCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                  {birthdayCount}
                </span>
              )}
            </button>

            {/* Role & Profile Switcher */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden ring-1 ring-slate-600 shrink-0">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[110px] xl:max-w-[140px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[110px] xl:max-w-[140px]">
                    {badge.label}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Current User Profile Dropdown (No 1-click switcher - requires log out & log in) */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-84 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800/80">
                  {/* Current User Profile Card */}
                  <div className="p-4 bg-slate-950/70 rounded-t-xl">
                    <div className="flex items-start space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center overflow-hidden ring-2 ring-blue-500/40 shrink-0">
                        {currentUser.avatar ? (
                          <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                        ) : (
                          currentUser.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-100 leading-tight truncate">
                          {currentUser.name}
                        </h4>
                        <div className="mt-1">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="mt-2 space-y-0.5 text-[11px] text-slate-400 font-mono">
                          <p className="truncate">
                            <span className="text-slate-500">Usuário:</span> @{currentUser.username || 'admin'}
                          </p>
                          {currentUser.whatsapp && (
                            <p className="truncate text-slate-300 font-sans flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0 inline" />
                              <span>{currentUser.whatsapp}</span>
                            </p>
                          )}
                          {currentUser.email && (
                            <p className="truncate text-slate-400 font-sans flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-blue-400 shrink-0 inline" />
                              <span>{currentUser.email}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Micro / Frentes Info */}
                    {isMacroLeader && supervisedMicros.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <div className="flex items-center space-x-1 text-[11px] font-semibold text-blue-400 mb-1.5">
                          <Layers className="w-3 h-3" />
                          <span>Frentes sob sua Liderança ({supervisedMicros.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {supervisedMicros.map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] px-1.5 py-0.5 bg-blue-950/80 border border-blue-800/80 text-blue-200 rounded"
                            >
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {isMicroLeader && primaryMicro && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1 mb-1">
                          <Layers className="w-3 h-3" />
                          <span>Micro Liderada:</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 rounded font-medium">
                          {primaryMicro.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for current user */}
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenUserManagement(currentUser.id);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span>Editar Meu Perfil & Foto</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/60 rounded text-blue-200 font-bold border border-blue-800/50">
                        Editar
                      </span>
                    </button>

                    {(isAdmin || isMacroLeader) && (
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenUserManagement();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 text-xs font-semibold text-blue-300 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span>Painel da Liderança (Líderes Macro & Micro)</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-800/60 rounded text-blue-200 font-bold">
                          Gerenciar
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenUserManagement();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center space-x-2 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Alterar Minha Senha</span>
                    </button>
                  </div>

                  {/* Clarification Box: How to switch user */}
                  <div className="p-3 bg-slate-950/40 text-[11px] text-slate-400 leading-relaxed">
                    <p className="flex items-start space-x-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>
                        Por segurança, para alternar para outro líder ou usuário, finalize sua sessão e faça login com a conta correspondente.
                      </span>
                    </p>
                  </div>

                  {/* Footer with Reset & Logout */}
                  <div className="p-2.5 flex items-center justify-between">
                    {isAdmin ? (
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsResetConfirmOpen(true);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-950/40 transition-colors flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Restaurar Dados</span>
                      </button>
                    ) : <div />}

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-bold text-slate-200 transition-all flex items-center space-x-1.5 shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

    <ConfirmDialog
      isOpen={isResetConfirmOpen}
      title="Restaurar Dados de Fábrica"
      message="Isso apaga permanentemente TODOS os voluntários, escalas, micros, famílias e líderes cadastrados, mantendo apenas sua conta de administrador. Esta ação não pode ser desfeita."
      details={[
        'Todos os voluntários e famílias serão excluídos.',
        'Todas as escalas e o histórico de rodízio serão apagados.',
        'Todos os micros/frentes e funções serão removidos.',
        'Sua conta de administrador e senha atual serão preservadas.'
      ]}
      confirmLabel="Sim, Apagar Tudo"
      tone="danger"
      onCancel={() => setIsResetConfirmOpen(false)}
      onConfirm={() => {
        setIsResetConfirmOpen(false);
        onResetData();
      }}
    />
    </>
  );
};

