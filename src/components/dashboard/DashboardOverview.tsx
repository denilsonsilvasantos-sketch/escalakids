import React from 'react';
import {
  Users,
  Calendar,
  Briefcase,
  Heart,
  Cake,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { UserAccount, Schedule, Person, Micro, BirthdayNotification } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';

interface DashboardOverviewProps {
  currentUser: UserAccount;
  onNavigate: (view: string) => void;
  onOpenNewVolunteer: () => void;
  onOpenVolunteerDetail: (person: Person) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  onNavigate,
  onOpenNewVolunteer,
  onOpenVolunteerDetail
}) => {
  const people = storageService.getPeople().filter((p) => p.active);
  const micros = storageService.getMicros();
  const families = storageService.getFamilies();
  const schedules = storageService.getSchedules();
  const birthdays = storageService.calculateBirthdays();
  const upcomingBirthdays = birthdays.filter(
    (b) => b.category === 'HOJE' || b.category === 'AMANHA' || b.category === 'PROXIMOS_7'
  );

  const activeSchedule = schedules[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-800/90 rounded-full text-xs font-semibold text-blue-300 border border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Sistema Oficial MEVAM Kids</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-extrabold font-display tracking-tight leading-tight text-white">
            Olá, {currentUser.name}!
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Bem-vindo ao painel unificado de voluntários e assistente de escalas inteligentes do MEVAM Kids.
            Gestão livre de duplicidades e com critérios transparentes de preferência familiar e rodízio.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={onOpenNewVolunteer}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/30 transition-all active:scale-[0.98] flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Cadastrar Voluntário</span>
            </button>

            <button
              onClick={() => onNavigate('macro-schedule')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Ver Escala Macro</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Volunteers */}
        <div
          onClick={() => onNavigate('volunteers')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
              100% Únicos
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">{people.length}</span>
            <p className="text-[11px] sm:text-xs text-slate-700 font-medium">Voluntários Ativos</p>
          </div>
        </div>

        {/* Micros */}
        <div
          onClick={() => onNavigate('micros-functions')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-md">
              Dinâmicos
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">{micros.length}</span>
            <p className="text-[11px] sm:text-xs text-slate-700 font-medium">Micros / Frentes</p>
          </div>
        </div>

        {/* Families */}
        <div
          onClick={() => onNavigate('families')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-rose-500" />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-md">
              Vínculos
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">{families.length}</span>
            <p className="text-[11px] sm:text-xs text-slate-700 font-medium">Núcleos Familiares</p>
          </div>
        </div>

        {/* Birthdays */}
        <div
          onClick={() => onNavigate('birthdays')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-2 sm:space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Cake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md">
              Próximos 7d
            </span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
              {upcomingBirthdays.length}
            </span>
            <p className="text-[11px] sm:text-xs text-slate-700 font-medium">Aniversariantes</p>
          </div>
        </div>
      </div>

      {/* Main Content: Current Schedule & Birthdays Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Schedule Overview Card */}
        {activeSchedule && (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded uppercase tracking-wider">
                  Escala em Andamento
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 font-display mt-1">
                  {activeSchedule.title}
                </h2>
                <p className="text-xs text-slate-600">
                  {activeSchedule.eventName} • {activeSchedule.dates.length} Cultos Programados
                </p>
              </div>

              <button
                onClick={() => onNavigate('macro-schedule')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
              >
                <span>Abrir Grade</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Metrics pills */}
            {activeSchedule.qualityMetrics && (
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-700 text-[11px] block">Taxa de Preenchimento:</span>
                  <span className="text-lg font-extrabold text-slate-900 font-display">
                    {activeSchedule.qualityMetrics.filledPercent}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-700 text-[11px] block">Conformidade Disponibilidade:</span>
                  <span className="text-lg font-extrabold text-emerald-700 font-display">
                    {activeSchedule.qualityMetrics.availabilityPercent}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-700 text-[11px] block">Equilíbrio & Rodízio:</span>
                  <span className="text-lg font-extrabold text-indigo-700 font-display">
                    {activeSchedule.qualityMetrics.balancePercent}%
                  </span>
                </div>
              </div>
            )}

            {/* Micros Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Frentes Integradas nesta Escala:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {micros
                  .filter((m) => activeSchedule.microIds.includes(m.id))
                  .map((m) => {
                    const countSlots = activeSchedule.slots.filter((s) => s.microId === m.id).length;
                    const filled = activeSchedule.slots.filter((s) => s.microId === m.id && s.assignedPersonId).length;

                    return (
                      <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="font-bold text-slate-900 truncate">{m.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-700">
                          {filled} de {countSlots} vagas preenchidas
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Birthdays Right Widget */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cake className="w-5 h-5 text-rose-500" />
              <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
                Aniversários Próximos
              </h3>
            </div>
            <button
              onClick={() => onNavigate('birthdays')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingBirthdays.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-700 bg-slate-50 rounded-xl">
                Nenhum aniversariante nos próximos 7 dias.
              </div>
            ) : (
              upcomingBirthdays.slice(0, 5).map((b) => (
                <div
                  key={b.personId}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{b.personName}</div>
                    <div className="text-[11px] text-slate-700">
                      {formatDateBR(b.birthDate)} • {b.category === 'HOJE' ? '🎉 É HOJE!' : `${b.daysRemaining} dias`}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.category === 'HOJE' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {b.category === 'HOJE' ? 'Hoje' : `Em ${b.daysRemaining}d`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
