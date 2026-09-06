import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  User,
  Heart,
  Briefcase,
  Phone,
  MessageCircle,
  Plus,
  Trash2,
  Sparkles,
  CalendarCheck,
  ShieldAlert
} from 'lucide-react';
import { UserAccount, Person, AvailabilityRule, Schedule } from '../../types';
import { storageService } from '../../services/storageService';

interface VolunteerPortalViewProps {
  currentUser: UserAccount;
  onNavigate?: (view: string) => void;
}

export const VolunteerPortalView: React.FC<VolunteerPortalViewProps> = ({
  currentUser,
  onNavigate
}) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<AvailabilityRule[]>([]);
  const [newSpecificDate, setNewSpecificDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [showAddException, setShowAddException] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = () => {
    let p: Person | undefined;
    if (currentUser.personId) {
      p = storageService.getPersonById(currentUser.personId);
    }
    if (!p && currentUser.email) {
      p = storageService.getPeople().find((vol) => vol.email?.toLowerCase() === currentUser.email?.toLowerCase());
    }
    if (!p) {
      // Fallback: take first volunteer
      p = storageService.getPeople()[0];
    }

    if (p) {
      setPerson(p);
      const myAssignments = storageService.getVolunteerAssignments(p.id);
      setAssignments(myAssignments);
      const rules = storageService.getAvailabilitiesByPerson(p.id);
      setAvailabilities(rules);
    }
  };

  const handleAddUnavailableDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !newSpecificDate) return;

    const newRule: AvailabilityRule = {
      id: `avail-${Date.now()}`,
      personId: person.id,
      type: 'DATA_ESPECIFICA',
      specificDate: newSpecificDate,
      isAvailable: false,
      reason: newReason || 'Indisponibilidade informada pelo voluntário'
    };

    storageService.saveAvailability(newRule);
    setNewSpecificDate('');
    setNewReason('');
    setShowAddException(false);
    loadData();
  };

  const handleDeleteRule = (id: string) => {
    storageService.deleteAvailability(id);
    loadData();
  };

  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();
  const families = storageService.getFamilies();
  const personFamily = person?.familyId ? families.find((f) => f.id === person.familyId) : null;

  const formatDateBR = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner overflow-hidden">
            {currentUser.avatar || person?.avatarUrl ? (
              <img src={currentUser.avatar || person?.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0)
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight">
                Olá, {person?.nickname || currentUser.name.split(' ')[0]}!
              </h1>
              <span className="px-2 py-0.5 bg-white/20 text-white text-[11px] font-bold rounded-full border border-white/30">
                Portal do Voluntário
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
              Bem-vindo ao MEVAM Kids. Aqui você acompanha suas escalas e define sua disponibilidade.
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-right">
          <span className="text-[11px] text-blue-200 block uppercase font-bold tracking-wider">
            Escalas Confirmadas
          </span>
          <span className="text-2xl font-extrabold">{assignments.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assignments & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Assignments Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Minhas Escalas no MEVAM Kids</h3>
                  <p className="text-xs text-slate-500">Datas e funções onde você está escalado</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                {assignments.length} data(s)
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {assignments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Você ainda não possui escalas agendadas para os próximos cultos.
                </div>
              ) : (
                assignments.map((item, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-700 flex flex-col items-center justify-center font-bold shrink-0">
                        <span className="text-[10px] uppercase">{formatDateBR(item.date).split('/')[1] || '09'}</span>
                        <span className="text-sm font-extrabold leading-none">{formatDateBR(item.date).split('/')[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">{item.functionName}</span>
                          {item.sectionTitle && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded">
                              {item.sectionTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1.5">
                          <span>{item.microName}</span>
                          <span>•</span>
                          <span>{item.scheduleTitle} ({item.shift})</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-lg flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Escalado</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Availability Management Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Minha Disponibilidade & Ausências</h3>
                  <p className="text-xs text-slate-500">Avise a liderança com antecedência se for viajar ou não puder servir</p>
                </div>
              </div>

              <button
                onClick={() => setShowAddException(!showAddException)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Informar Ausência</span>
              </button>
            </div>

            {/* Form to add unavailable date */}
            {showAddException && (
              <form onSubmit={handleAddUnavailableDate} className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-bold text-xs text-slate-800">Registrar Data de Indisponibilidade</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Data (DD/MM/AAAA)</label>
                    <input
                      type="date"
                      required
                      value={newSpecificDate}
                      onChange={(e) => setNewSpecificDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Motivo (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: Viagem de trabalho, compromisso familiar..."
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddException(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Salvar Ausência
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100 mt-3">
              {availabilities.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhuma restrição de data cadastrada. Você está disponível para as escalas normais.
                </div>
              ) : (
                availabilities.map((rule) => (
                  <div key={rule.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            rule.isAvailable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rule.isAvailable ? 'Disponível' : 'Indisponível'}
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          {rule.type === 'DATA_ESPECIFICA'
                            ? `Data específica: ${formatDateBR(rule.specificDate || '')}`
                            : `Dia recorrente: Domingo`}
                        </span>
                      </div>
                      {rule.reason && <p className="text-[11px] text-slate-500 mt-0.5">{rule.reason}</p>}
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: My Profile & Preferences Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Meu Cadastro</h3>
                <p className="text-xs text-slate-500">Dados do voluntário no sistema</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Nome Completo</span>
                <span className="font-semibold text-slate-900">{person?.name || currentUser.name}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Data de Nascimento</span>
                <span className="font-semibold text-slate-900">{formatDateBR(person?.birthDate || '')}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">WhatsApp / Telefone</span>
                <span className="font-semibold text-slate-900">{person?.phone || currentUser.whatsapp || 'Não informado'}</span>
              </div>

              {personFamily && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Família</span>
                  <span className="font-semibold text-slate-900">{personFamily.name}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Micros / Frentes Vinculadas</span>
              <div className="flex flex-wrap gap-1.5">
                {person?.microIds.map((mId) => {
                  const m = micros.find((micro) => micro.id === mId);
                  return (
                    <span
                      key={mId}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border"
                      style={{
                        backgroundColor: `${m?.color || '#2563EB'}15`,
                        borderColor: `${m?.color || '#2563EB'}40`,
                        color: m?.color || '#2563EB'
                      }}
                    >
                      {m?.name || mId}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
