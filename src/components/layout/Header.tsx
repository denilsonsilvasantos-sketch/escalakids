import React, { useState, useEffect } from 'react';
import {
  Search,
  Cake,
  Shield,
  UserCheck,
  RefreshCw,
  ChevronDown,
  Users,
  KeyRound,
  LogOut
} from 'lucide-react';
import { UserAccount, SupabaseSyncState } from '../../types';
import { storageService } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface HeaderProps {
  currentUser: UserAccount;
  onUserChange: (user: UserAccount) => void;
  onOpenGlobalSearch: () => void;
  onNavigate: (view: string) => void;
  onResetData: () => void;
  onOpenSupabaseModal: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenGlobalSearch,
  onNavigate,
  onResetData,
  onOpenSupabaseModal,
  onOpenUserManagement,
  onLogout,
  onToggleMobileMenu
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [syncState, setSyncState] = useState<SupabaseSyncState>(supabaseService.getSyncState());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN_LIDERANCA';
  const isMacroLeader = currentUser.role === 'LIDER_MACRO';

  useEffect(() => {
    setUsers(storageService.getUsers());
    const bdays = storageService.calculateBirthdays();
    const upcoming = bdays.filter((b) => b.category === 'HOJE' || b.category === 'AMANHA' || b.category === 'PROXIMOS_7');
    setBirthdayCount(upcoming.length);

    const unsub = supabaseService.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, [currentUser]);

  const handleRoleSelect = (u: UserAccount) => {
    const updated = storageService.setCurrentUser(u.id);
    onUserChange(updated);
    setIsDropdownOpen(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN_LIDERANCA':
        return { label: 'Liderança Principal (Admin)', bg: 'bg-amber-950/80 text-amber-300 border-amber-800' };
      case 'LIDER_MACRO':
        return { label: 'Líder Macro (Frentes)', bg: 'bg-blue-950/80 text-blue-300 border-blue-800' };
      case 'LIDER_MICRO':
        return { label: 'Líder de Micro', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' };
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

              {/* Role Dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200 uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      <span>Usuário Ativo: {currentUser.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Use "Alterar Minha Senha" abaixo para trocar sua senha de acesso.
                    </p>
                  </div>

                  {/* Actions for current user */}
                  <div className="p-2 border-b border-slate-800 space-y-1">
                    {(isAdmin || isMacroLeader) && (
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenUserManagement();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-blue-300 flex items-center space-x-2 transition-colors"
                      >
                        <Users className="w-4 h-4 text-blue-400" />
                        <span>Gestão de Acessos & Líderes</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenUserManagement();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center space-x-2 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Alterar Minha Senha</span>
                    </button>
                  </div>

                  {/* Profile simulation switcher - ADMIN ONLY */}
                  {isAdmin && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Trocar Perfil / Simulação (Admin):
                      </div>

                      <div className="py-1 max-h-48 overflow-y-auto">
                        {users.map((u) => {
                          const uBadge = getRoleBadge(u.role);
                          const isSelected = u.id === currentUser.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => handleRoleSelect(u)}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                                isSelected ? 'bg-blue-950/70 border-l-4 border-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {u.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-slate-200 truncate">{u.name}</p>
                                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 border rounded ${uBadge.bg}`}>
                                    {uBadge.label}
                                  </span>
                                </div>
                              </div>
                              {isSelected && <UserCheck className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="px-3 pt-2 pb-1 border-t border-slate-800 flex items-center justify-between">
                    {isAdmin ? (
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsResetConfirmOpen(true);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1"
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
                      className="text-[11px] text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Sair</span>
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

