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
  PlusCircle
} from 'lucide-react';
import { UserAccount } from '../../types';
import { storageService } from '../../services/storageService';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserAccount;
  onOpenNewVolunteerModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onOpenNewVolunteerModal
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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
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
  );
};
