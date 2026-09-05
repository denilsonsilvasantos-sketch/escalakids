import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users,
  Briefcase,
  Heart,
  Cake,
  History,
  ShieldCheck,
  PlusCircle,
  X,
  Menu,
  CalendarOff
} from 'lucide-react';
import { UserAccount } from '../../types';
import { storageService } from '../../services/storageService';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserAccount;
  onOpenNewVolunteerModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenNewVolunteerModal,
  isMobileOpen,
  onCloseMobile,
  onToggleMobileMenu
}) => {
  const isAdmin = currentUser.role === 'ADMIN_LIDERANCA';
  const isMacroLeader = currentUser.role === 'LIDER_MACRO';
  const isMicroLeader = currentUser.role === 'LIDER_MICRO';

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Painel da Liderança',
      icon: LayoutDashboard,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'macro-schedule',
      label: 'Escala Macro (Geral)',
      icon: Calendar,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'COORDENADOR'],
      badge: 'Principal'
    },
    {
      id: 'micro-schedules',
      label: 'Escalas por Micro',
      icon: Layers,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'volunteers',
      label: 'Voluntários (Único)',
      icon: Users,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'micros-functions',
      label: 'Micros & Funções',
      icon: Briefcase,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'families',
      label: 'Famílias',
      icon: Heart,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'availability',
      label: 'Indisponibilidade',
      icon: CalendarOff,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'birthdays',
      label: 'Aniversários',
      icon: Cake,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'LIDER_MICRO', 'COORDENADOR'],
      badge: undefined
    },
    {
      id: 'audit-history',
      label: 'Histórico & Auditoria',
      icon: History,
      roles: ['ADMIN_LIDERANCA', 'LIDER_MACRO', 'COORDENADOR'],
      badge: undefined
    }
  ];

  const allowedItems = menuItems.filter((item) => item.roles.includes(currentUser.role));

  return (
    <>
      {/* Desktop Persistent Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {/* Quick Action Button */}
        <div className="p-4 border-b border-slate-800/80">
          <button
            onClick={onOpenNewVolunteerModal}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/30 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>NOVA PESSOA</span>
          </button>
          <div className="mt-2 text-[10px] text-center text-slate-400 font-medium">
            Cadastro guiado anti-duplicidade
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Permission scope indicator at bottom */}
        <div className="p-4 border border-slate-800 bg-slate-800/60 m-3 rounded-xl">
          <div className="flex items-center space-x-2 text-slate-200 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Escopo Autorizado</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 leading-tight">
            {isAdmin && 'Acesso total a todos os micros, funções, escalas e configurações.'}
            {isMacroLeader && `Acesso aos micros concedidos (${currentUser.allowedMicroIds?.length || 0} frentes).`}
            {isMicroLeader && `Acesso restrito ao micro de ${storageService.getMicroById(currentUser.primaryMicroId || '')?.name || 'sua liderança'}.`}
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer Navigation */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs md:hidden flex animate-in fade-in duration-200"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[85vw] bg-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <img
                  src="/mevam-kids-logo.png"
                  alt="MEVAM Kids"
                  className="h-7 w-auto"
                />
                <div className="text-[10px] text-slate-400 font-medium">Menu Principal</div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Button in Mobile Drawer */}
            <div className="p-3 border-b border-slate-800/80">
              <button
                onClick={() => {
                  onCloseMobile?.();
                  onOpenNewVolunteerModal();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ CADASTRAR PESSOA</span>
              </button>
            </div>

            {/* Navigation links in Mobile Drawer */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {allowedItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Scope info in drawer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
              <div className="font-bold text-slate-300 flex items-center space-x-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Perfil: {currentUser.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email || currentUser.username}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Thumb-friendly for Smartphones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-1.5 px-1 shadow-2xl safe-area-inset-bottom">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
            currentView === 'dashboard' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Painel</span>
        </button>

        <button
          onClick={() => onNavigate('macro-schedule')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
            currentView === 'macro-schedule' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Escalas</span>
        </button>

        <button
          onClick={() => onNavigate('volunteers')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
            currentView === 'volunteers' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Voluntários</span>
        </button>

        <button
          onClick={() => onNavigate('birthdays')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
            currentView === 'birthdays' ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cake className="w-5 h-5 mb-0.5" />
          <span>Aniversários</span>
        </button>

        <button
          onClick={onToggleMobileMenu}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
            isMobileOpen ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
};
