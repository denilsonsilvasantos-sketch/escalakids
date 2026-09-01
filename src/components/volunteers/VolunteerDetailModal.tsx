import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  Phone,
  Mail,
  Heart,
  Briefcase,
  Shield,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History
} from 'lucide-react';
import { Person, AvailabilityRule } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';

interface VolunteerDetailModalProps {
  person: Person | null;
  onClose: () => void;
  onEdit: (person: Person) => void;
}

export const VolunteerDetailModal: React.FC<VolunteerDetailModalProps> = ({
  person,
  onClose,
  onEdit
}) => {
  if (!person) return null;

  const micros = storageService.getMicros();
  const functions = storageService.getFunctions();
  const family = person.familyId ? storageService.getFamilyById(person.familyId) : null;
  const familyMembers = person.familyId ? storageService.getFamilyMembers(person.familyId) : [];
  const availabilities = storageService.getPersonAvailabilities(person.id);
  const rotHistory = storageService.getRotationHistory().filter((h) => h.personId === person.id);

  // New Availability Rule Form
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleType, setRuleType] = useState<'RECORRENTE' | 'DATA_ESPECIFICA'>('DATA_ESPECIFICA');
  const [specificDate, setSpecificDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [shift, setShift] = useState<'MANHA' | 'NOITE' | 'AMBOS'>('AMBOS');
  const [isAvailable, setIsAvailable] = useState<boolean>(false); // default adding unavailability
  const [reason, setReason] = useState('');

  const handleAddRule = () => {
    if (ruleType === 'DATA_ESPECIFICA' && !specificDate) {
      alert('Informe a data específica.');
      return;
    }

    const newRule: AvailabilityRule = {
      id: `avail-${Date.now()}`,
      personId: person.id,
      type: ruleType,
      dayOfWeek: ruleType === 'RECORRENTE' ? dayOfWeek : undefined,
      specificDate: ruleType === 'DATA_ESPECIFICA' ? specificDate : undefined,
      shift,
      isAvailable,
      reason: reason.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    storageService.saveAvailability(newRule);
    setIsAddingRule(false);
    setReason('');
    setSpecificDate('');
  };

  const handleDeleteRule = (ruleId: string) => {
    storageService.deleteAvailability(ruleId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-2xl shadow-md border-2 border-white/20">
              {person.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold font-display">{person.name}</h2>
                {person.nickname && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    {person.nickname}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Nascimento: {formatDateBR(person.birthDate)} • Cadastro Único MEVAM Kids
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(person)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Editar Perfil
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{person.phone}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="truncate">{person.email || 'Não informado'}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>{family ? `${family.name} (${family.priority})` : 'Sem vínculo familiar'}</span>
            </div>
          </div>

          {/* Family Section */}
          {family && (
            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                  <span>Núcleo Familiar: {family.name}</span>
                </span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Prioridade de Escalar Juntos: {family.priority}
                </span>
              </div>
              <div className="text-xs text-rose-800">
                Outros membros da família:{' '}
                {familyMembers
                  .filter((m) => m.id !== person.id)
                  .map((m) => m.name)
                  .join(', ') || 'Apenas este membro cadastrado'}
              </div>
            </div>
          )}

          {/* Micros & Functions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Micros e Funções Atribuídas</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {person.microIds.map((mId) => {
                const micro = micros.find((m) => m.id === mId);
                const prefs = person.functionPreferences.filter((fp) => fp.microId === mId);

                return (
                  <div key={mId} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: micro?.color || '#4f46e5' }} />
                      <span className="font-bold text-xs text-slate-900">{micro?.name}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {prefs.map((fp) => {
                        const fn = functions.find((f) => f.id === fp.functionId);
                        return (
                          <div key={fp.functionId} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>{fn?.name}</span>
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                                {fp.experienceLevel}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 mt-1">
                              Turno: {fp.preferredShifts?.join(', ') || 'Qualquer'} • Dias:{' '}
                              {fp.preferredDays?.join(', ') || 'Domingo'}
                            </div>
                            {fp.preferredAgeGroups && fp.preferredAgeGroups.length > 0 && (
                              <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                                Faixas: {fp.preferredAgeGroups.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Availability & Unavailability Calendar Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Regras de Disponibilidade & Indisponibilidade</span>
              </h3>
              <button
                onClick={() => setIsAddingRule(!isAddingRule)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingRule ? 'Cancelar' : '+ Adicionar Bloqueio/Data'}</span>
              </button>
            </div>

            {/* Add Rule Sub-form */}
            {isAddingRule && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">TIPO</label>
                    <select
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="DATA_ESPECIFICA">Data Específica (Bloqueio)</option>
                      <option value="RECORRENTE">Recorrente (Dia da Semana)</option>
                    </select>
                  </div>

                  {ruleType === 'DATA_ESPECIFICA' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">DATA</label>
                      <input
                        type="date"
                        value={specificDate}
                        onChange={(e) => setSpecificDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">DIA DA SEMANA</label>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        <option value={0}>Domingo</option>
                        <option value={3}>Quarta-feira</option>
                        <option value={6}>Sábado</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">TURNO</label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="AMBOS">Todos os Turnos</option>
                      <option value="MANHA">Apenas Manhã</option>
                      <option value="NOITE">Apenas Noite</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">STATUS</label>
                    <select
                      value={isAvailable ? 'SIM' : 'NAO'}
                      onChange={(e) => setIsAvailable(e.target.value === 'SIM')}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="NAO">❌ Indisponível / Folga / Viagem</option>
                      <option value="SIM">✅ Disponível com Prioridade</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">MOTIVO (OPCIONAL)</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Viagem de trabalho, cirurgia..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddRule}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs"
                  >
                    Salvar Regra
                  </button>
                </div>
              </div>
            )}

            {/* List of Rules */}
            <div className="space-y-1.5">
              {availabilities.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-700 bg-slate-50 rounded-xl">
                  Nenhuma restrição registrada. Voluntário 100% disponível para escalas regulares.
                </div>
              ) : (
                availabilities.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      {rule.isAvailable ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900">
                          {rule.type === 'DATA_ESPECIFICA'
                            ? `Data ${formatDateBR(rule.specificDate)}`
                            : `Recorrente: ${rule.dayOfWeek === 0 ? 'Domingos' : rule.dayOfWeek === 3 ? 'Quartas' : 'Outro'}`}
                        </span>
                        <span className="text-slate-700 ml-2">({rule.shift})</span>
                        {rule.reason && <span className="text-slate-700 ml-2 italic">— {rule.reason}</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Excluir regra"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Serving History */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <History className="w-4 h-4 text-slate-600" />
              <span>Histórico de Escalas Realizadas</span>
            </h3>

            {rotHistory.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-700 bg-slate-50 rounded-xl">
                Ainda não constam participações arquivadas para este voluntário.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {rotHistory.map((item) => {
                  const m = micros.find((micro) => micro.id === item.microId);
                  const fn = functions.find((f) => f.id === item.functionId);
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{item.date}</span>
                        <span className="text-slate-700 ml-2">
                          {m?.name} → {fn?.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-700">Concluído</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
