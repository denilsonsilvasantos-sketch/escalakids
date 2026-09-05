import React, { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { Person, AvailabilityRule } from '../../types';
import { storageService } from '../../services/storageService';
import { formatDateBR } from '../../utils/dateUtils';

interface AvailabilityRulesEditorProps {
  person: Person;
}

// Lets someone pick a volunteer and register the specific dates or recurring
// weekdays/shifts they can't serve. Shared by the volunteer detail modal and
// the dedicated "Indisponibilidade" page so both stay in sync automatically.
export const AvailabilityRulesEditor: React.FC<AvailabilityRulesEditorProps> = ({ person }) => {
  const [availabilitiesList, setAvailabilitiesList] = useState<AvailabilityRule[]>(() =>
    storageService.getPersonAvailabilities(person.id)
  );

  useEffect(() => {
    setAvailabilitiesList(storageService.getPersonAvailabilities(person.id));
  }, [person.id]);

  const [isAddingRule, setIsAddingRule] = useState(false);
  const [ruleType, setRuleType] = useState<'RECORRENTE' | 'DATA_ESPECIFICA'>('DATA_ESPECIFICA');
  const [specificDate, setSpecificDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [shift, setShift] = useState<'MANHA' | 'NOITE' | 'ESPECIAL' | 'AMBOS'>('AMBOS');
  const [isAvailable, setIsAvailable] = useState<boolean>(false); // default adding unavailability
  const [reason, setReason] = useState('');

  const handleAddRule = () => {
    if (ruleType === 'DATA_ESPECIFICA' && !specificDate) {
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
    setAvailabilitiesList(storageService.getPersonAvailabilities(person.id));
    setIsAddingRule(false);
    setReason('');
    setSpecificDate('');
  };

  const handleDeleteRule = (ruleId: string) => {
    storageService.deleteAvailability(ruleId);
    setAvailabilitiesList(storageService.getPersonAvailabilities(person.id));
  };

  return (
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
                <option value="ESPECIAL">Apenas Cultos Especiais</option>
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
        {availabilitiesList.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-700 bg-slate-50 rounded-xl">
            Nenhuma restrição registrada. Voluntário 100% disponível para escalas regulares.
          </div>
        ) : (
          availabilitiesList.map((rule) => (
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
  );
};
