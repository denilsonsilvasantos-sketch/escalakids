import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Cake,
  Shield,
  UserCheck,
  RefreshCw,
  Sliders,
  ChevronDown,
  Cloud,
  CloudCheck,
  CloudOff,
  Database,
  Users,
  KeyRound,
  LogOut,
  UserPlus
} from 'lucide-react';
import { UserAccount, SupabaseSyncState } from '../../types';
import { storageService } from '../../services/storageService';
import { supabaseService } from '../../services/supabaseService';

interface HeaderProps {
  currentUser: UserAccount;
  onUserChange: (user: UserAccount) => void;
  onOpenGlobalSearch: () => void;
  onNavigate: (view: string) => void;
  onResetData: () => void;
  onOpenSupabaseModal: () => void;
  onOpenUserManagement: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenGlobalSearch,
  onNavigate,
  onResetData,
  onOpenSupabaseModal,
  onOpenUserManagement,
  onLogout
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [syncState, setSyncState] = useState<SupabaseSyncState>(supabaseService.getSyncState());

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
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md font-extrabold text-lg tracking-tight">
              MK
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-display">
                  MEVAM KIDS
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-800/80 rounded-md uppercase tracking-wider">
                  Escalas Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Gestão Unificada de Voluntários & Escalas
              </p>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <button
              onClick={onOpenGlobalSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-slate-300 bg-slate-800/90 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-slate-700/80"
              title="Buscar voluntários, famílias, micros ou funções"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 font-medium">Buscar pessoa, micro, família ou função...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold text-slate-300 bg-slate-700 border border-slate-600 rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons & Role Switcher */}
          <div className="flex items-center space-x-2.5">
            {/* User Management Shortcut for Admins and Macro Leaders */}
            {(isAdmin || isMacroLeader) && (
              <button
                onClick={onOpenUserManagement}
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all"
                title="Gestão de Líderes, Senhas e Acessos"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Gestão de Acessos</span>
              </button>
            )}

            {/* Supabase Cloud Sync Status Button - ONLY FOR ADMIN */}
            {isAdmin && (
              <button
                onClick={onOpenSupabaseModal}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  syncState.isConnected
                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title="Configurar Conexão com Supabase e Script SQL (Restrito ao ADMIN)"
              >
                <Database className={`w-3.5 h-3.5 ${syncState.isConnected ? 'text-emerald-400' : 'text-blue-400'}`} />
                <span className="hidden sm:inline">
                  {syncState.isConnected ? 'Supabase Conectado' : 'Supabase SQL'}
                </span>
              </button>
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
              className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
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
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden ring-1 ring-slate-600">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[130px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {badge.label}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                      Senha configurada: <strong className="text-amber-300 font-mono">{currentUser.password || (isAdmin ? 'ADMIN' : '123')}</strong>
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
                          if (confirm('Deseja restaurar todos os dados iniciais do MEVAM Kids?')) {
                            onResetData();
                            setIsDropdownOpen(false);
                          }
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
  );
};

