import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Download,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  Info,
  Calendar,
  X,
  ShieldAlert,
  Edit,
  Trash2
} from 'lucide-react';
import { Schedule, ScheduleSlot, Micro, MicroFunction, Person, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { schedulerAlgorithm, CandidateScore } from '../../services/schedulerAlgorithm';
import { exportService } from '../../services/exportService';
import { formatDateBR } from '../../utils/dateUtils';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface MicroScheduleViewProps {
  currentUser: UserAccount;
}

export const MicroScheduleView: React.FC<MicroScheduleViewProps> = ({ currentUser }) => {
  const allMicros = storageService.getMicros();
  const allFunctions = storageService.getFunctions();
  const allPeople = storageService.getPeople();
  const [schedules, setSchedules] = useState<Schedule[]>(storageService.getSchedules());

  // Filter micros based on role
  const accessibleMicros = allMicros.filter((m) => storageService.canAccessMicro(m.id, currentUser));
  const [selectedMicroId, setSelectedMicroId] = useState<string>(
    currentUser.primaryMicroId || accessibleMicros[0]?.id || allMicros[0]?.id
  );

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeSlot, setActiveSlot] = useState<ScheduleSlot | null>(null);
  const [activeSlotCandidates, setActiveSlotCandidates] = useState<CandidateScore[]>([]);
  const [guestNameInput, setGuestNameInput] = useState('');

  // New / Edit Schedule Modal state (a schedule scoped to just this one micro —
  // lets a micro leader run their own front independently of whatever the macro
  // schedule looks like; macro leaders still see it since it's the same shared
  // Schedule record, just with microIds: [thisMicro]).
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formEventName, setFormEventName] = useState('Cultos de Domingo');
  const [formShift, setFormShift] = useState<'MANHA' | 'NOITE' | 'ESPECIAL' | 'AMBOS'>('NOITE');
  const [formDates, setFormDates] = useState<string[]>([
    '2026-09-06',
    '2026-09-13',
    '2026-09-20',
    '2026-09-27'
  ]);
  const [formDateInput, setFormDateInput] = useState('');

  // Synchronize schedules without closing active slot picker modal
  useEffect(() => {
    const handleSync = () => {
      setSchedules(storageService.getSchedules());
    };
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  const currentMicro = allMicros.find((m) => m.id === selectedMicroId) || accessibleMicros[0];
  const canManageSchedule =
    currentUser.role === 'ADMIN_LIDERANCA' || storageService.canAccessMicro(currentMicro?.id || '', currentUser);

  // Only schedules that actually include this micro — a micro leader's own
  // schedules, plus any macro schedule an admin/macro leader included them in.
  const schedulesForMicro = schedules.filter((s) => s.microIds.includes(currentMicro?.id || ''));

  // Keep the selection valid as the micro or the schedule list changes.
  useEffect(() => {
    if (!schedulesForMicro.some((s) => s.id === selectedScheduleId)) {
      setSelectedScheduleId(schedulesForMicro[0]?.id || '');
    }
  }, [currentMicro?.id, schedulesForMicro.map((s) => s.id).join(',')]);

  const currentSchedule = schedulesForMicro.find((s) => s.id === selectedScheduleId) || schedulesForMicro[0];
  const microFunctions = allFunctions.filter((f) => f.microId === currentMicro?.id);

  const resetScheduleForm = () => {
    setFormTitle(currentMicro ? `Escala ${currentMicro.name}` : 'Nova Escala');
    setFormEventName('Cultos de Domingo');
    setFormShift('NOITE');
    setFormDates(['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27']);
    setFormDateInput('');
  };

  const handleOpenNewSchedule = () => {
    resetScheduleForm();
    setIsNewScheduleModalOpen(true);
  };

  const handleCreateSchedule = () => {
    if (!currentMicro || !formTitle.trim() || formDates.length === 0) {
      alert('Preencha o título e mantenha ao menos uma data.');
      return;
    }

    const scheduleId = `sched-${Date.now()}`;
    const slots = schedulerAlgorithm.createSlotsForSchedule(scheduleId, formDates, [currentMicro.id], formShift);
    const sortedDates = [...formDates].sort();

    const newSched: Schedule = {
      id: scheduleId,
      title: formTitle.trim(),
      eventName: formEventName.trim() || 'Cultos MEVAM Kids',
      period: `${formatDateBR(sortedDates[0])} até ${formatDateBR(sortedDates[sortedDates.length - 1])}`,
      shift: formShift,
      dates: sortedDates,
      microIds: [currentMicro.id],
      status: 'RASCUNHO',
      slots,
      qualityMetrics: {
        availabilityPercent: 100,
        filledPercent: 0,
        balancePercent: 90,
        rotationPercent: 85,
        familyPercent: 85,
        preferencePercent: 90
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.saveSchedule(newSched);
    setSchedules(storageService.getSchedules());
    setSelectedScheduleId(newSched.id);
    setIsNewScheduleModalOpen(false);
  };

  const handleOpenEditSchedule = () => {
    if (!currentSchedule) return;
    setFormTitle(currentSchedule.title);
    setFormEventName(currentSchedule.eventName || '');
    setFormShift(currentSchedule.shift as any);
    setFormDates([...currentSchedule.dates]);
    setFormDateInput('');
    setIsEditScheduleModalOpen(true);
  };

  const handleSaveEditSchedule = () => {
    if (!currentSchedule || !formTitle.trim() || formDates.length === 0) {
      alert('Preencha o título e mantenha ao menos uma data.');
      return;
    }

    const sortedDates = [...formDates].sort();
    const updated: Schedule = {
      ...currentSchedule,
      title: formTitle.trim(),
      eventName: formEventName.trim() || undefined,
      shift: formShift,
      dates: sortedDates,
      period: `${formatDateBR(sortedDates[0])} até ${formatDateBR(sortedDates[sortedDates.length - 1])}`,
      updatedAt: new Date().toISOString()
    };

    storageService.saveSchedule(updated);
    setSchedules(storageService.getSchedules());
    setIsEditScheduleModalOpen(false);
  };

  const handleConfirmDeleteSchedule = () => {
    if (!scheduleToDelete) return;
    storageService.deleteSchedule(scheduleToDelete.id);
    setSchedules(storageService.getSchedules());
    setScheduleToDelete(null);
  };

  const handleRunMicroAlgorithm = () => {
    if (!currentSchedule || !currentMicro) return;
    setIsGenerating(true);

    setTimeout(() => {
      const result = schedulerAlgorithm.generateSchedule(currentSchedule, [currentMicro.id]);
      storageService.saveSchedule(result.schedule);
      setSchedules(storageService.getSchedules());
      setIsGenerating(false);
    }, 300);
  };

  const handleOpenSlotPicker = (slot: ScheduleSlot) => {
    setActiveSlot(slot);
    setGuestNameInput(!slot.assignedPersonId ? slot.assignedPersonName || '' : '');
    const weights = currentMicro?.algorithmWeights || {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 80,
      frequencyBalance: 90,
      recency: 80,
      rotation: 80,
      family: 60,
      experience: 50
    };

    const candidates: CandidateScore[] = [];
    for (const person of allPeople.filter((p) => p.active)) {
      const score = schedulerAlgorithm.evaluateCandidate(
        person,
        slot,
        currentSchedule,
        currentSchedule.slots,
        weights
      );
      candidates.push(score);
    }

    candidates.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.totalScore - a.totalScore;
    });

    setActiveSlotCandidates(candidates);
  };

  const handleAssignPersonToSlot = (personId: string) => {
    if (!activeSlot || !currentSchedule) return;
    storageService.updateSlotAssignment(currentSchedule.id, activeSlot.id, personId, true);
    setSchedules(storageService.getSchedules());
    setActiveSlot(null);
  };

  const handleAssignGuestToSlot = () => {
    if (!activeSlot || !currentSchedule || !guestNameInput.trim()) return;
    storageService.setSlotGuestName(currentSchedule.id, activeSlot.id, guestNameInput.trim());
    setSchedules(storageService.getSchedules());
    setActiveSlot(null);
  };

  const formatDateLabel = (d: string) => {
    const parts = d.split('-');
    if (parts.length === 3) {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]}/${months[mIdx] || parts[1]}`;
    }
    return d;
  };

  if (!currentMicro) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-700">
        Nenhum micro disponível para exibição.
      </div>
    );
  }

  const newOrEditScheduleModal = (isNewScheduleModalOpen || isEditScheduleModalOpen) && (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
        <h3 className="text-base font-bold text-slate-900 font-display">
          {isEditScheduleModalOpen ? 'Editar Escala' : `Nova Escala — ${currentMicro.name}`}
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">TÍTULO DA ESCALA *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">EVENTO / CULTO</label>
              <input
                type="text"
                value={formEventName}
                onChange={(e) => setFormEventName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">TURNO PRINCIPAL</label>
              <select
                value={formShift}
                onChange={(e) => setFormShift(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="NOITE">🌙 Noite (18h / 19h)</option>
                <option value="MANHA">☀️ Manhã (09h / 10h)</option>
                <option value="ESPECIAL">⭐ Culto Especial</option>
                <option value="AMBOS">✨ Todos os Turnos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">DATAS DO PERÍODO</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center space-x-1 text-xs bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg border border-indigo-200 font-semibold"
                >
                  <span>{formatDateBR(d)}</span>
                  <button
                    type="button"
                    onClick={() => setFormDates(formDates.filter((x) => x !== d))}
                    className="text-indigo-400 hover:text-indigo-700 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={formDateInput}
                onChange={(e) => setFormDateInput(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (formDateInput && !formDates.includes(formDateInput)) {
                    setFormDates([...formDates, formDateInput]);
                    setFormDateInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg"
              >
                + Adicionar Data
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={() => {
              setIsNewScheduleModalOpen(false);
              setIsEditScheduleModalOpen(false);
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            onClick={isEditScheduleModalOpen ? handleSaveEditSchedule : handleCreateSchedule}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            {isEditScheduleModalOpen ? 'Salvar Alterações' : 'Criar Escala'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-sm"
              style={{ backgroundColor: currentMicro.color }}
            >
              {currentMicro.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold text-slate-900 font-display">
                  Escala Setorial: {currentMicro.name}
                </h1>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                {currentSchedule ? `${currentSchedule.title} • ${currentSchedule.eventName}` : 'Nenhuma escala criada para esta frente ainda'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Micro selector if user has permission for multiple */}
            {accessibleMicros.length > 1 && (
              <select
                value={selectedMicroId}
                onChange={(e) => setSelectedMicroId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                {accessibleMicros.map((m) => (
                  <option key={m.id} value={m.id}>
                    Frente: {m.name}
                  </option>
                ))}
              </select>
            )}

            {/* Schedule selector, when this micro has more than one */}
            {schedulesForMicro.length > 1 && (
              <select
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                {schedulesForMicro.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({formatDateBR(s.dates[0])})
                  </option>
                ))}
              </select>
            )}

            {canManageSchedule && (
              <button
                onClick={handleOpenNewSchedule}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1"
                title="Criar Nova Escala para esta Frente"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Escala</span>
              </button>
            )}

            {currentSchedule && canManageSchedule && (
              <button
                onClick={handleOpenEditSchedule}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                title="Editar Dados da Escala"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {currentSchedule && canManageSchedule && (
              <button
                onClick={() => setScheduleToDelete(currentSchedule)}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200"
                title="Excluir esta Escala"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {currentSchedule && (
              <>
                {/* Run Algorithm specifically for this micro */}
                <button
                  onClick={handleRunMicroAlgorithm}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-2 active:scale-[0.98]"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Calculando...' : 'Preencher este Micro'}</span>
                </button>

                {/* Export single micro to Excel */}
                <button
                  onClick={() =>
                    exportService.exportToExcel(
                      currentSchedule,
                      [currentMicro.id],
                      `Escala_${currentMicro.name}_${currentSchedule.eventName}.xlsx`
                    )
                  }
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel do Micro</span>
                </button>

                {/* Export single micro to PDF */}
                <button
                  onClick={() =>
                    exportService.exportToPDF(
                      currentSchedule,
                      [currentMicro.id],
                  `Escala_${currentMicro.name}_${currentSchedule.eventName}.pdf`
                )
              }
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>PDF do Micro</span>
            </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!currentSchedule ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 font-display">Nenhuma escala cadastrada</h2>
            <p className="text-xs text-slate-600 mt-1">
              {canManageSchedule
                ? `Crie a primeira escala da frente "${currentMicro.name}".`
                : 'Aguarde a liderança criar a escala desta frente.'}
            </p>
          </div>
          {canManageSchedule && (
            <button
              onClick={handleOpenNewSchedule}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              + Criar Primeira Escala
            </button>
          )}
        </div>
      ) : (
      /* Grid of functions for this micro */
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold">
                <th className="py-3.5 px-4 w-72 uppercase tracking-wider">
                  FUNÇÃO / VAGA
                </th>
                {currentSchedule.dates.map((date) => (
                  <th key={date} className="py-3.5 px-4 text-center font-extrabold">
                    {formatDateLabel(date)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {microFunctions.map((fn) => {
                const count = fn.defaultRequiredCount || 1;

                return Array.from({ length: count }).map((_, slotIdx) => {
                  const slotIndexNumber = slotIdx + 1;
                  const label = count > 1 ? `${fn.name} ${slotIndexNumber}` : fn.name;

                  return (
                    <tr key={`${fn.id}-${slotIndexNumber}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-100">
                        {label}
                      </td>

                      {currentSchedule.dates.map((date) => {
                        const slot = currentSchedule.slots.find(
                          (s) =>
                            s.microId === currentMicro.id &&
                            s.functionId === fn.id &&
                            s.date === date &&
                            s.slotIndex === slotIndexNumber
                        );

                        if (!slot) return <td key={date} className="p-2 border-r border-slate-100 text-center text-slate-300">-</td>;

                        const isAssigned = !!slot.assignedPersonId || !!slot.assignedPersonName;
                        const isGuest = isAssigned && !slot.assignedPersonId;

                        return (
                          <td key={date} className="p-2 border-r border-slate-100">
                            {isAssigned ? (
                              <div
                                onClick={() => handleOpenSlotPicker(slot)}
                                className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between shadow-2xs ${
                                  isGuest
                                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                                    : slot.manualOverride
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                                }`}
                                title={isGuest ? 'Participação especial (sem cadastro)' : undefined}
                              >
                                <span className="truncate">
                                  {isGuest && '🌟 '}
                                  {slot.assignedPersonName}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenSlotPicker(slot)}
                                className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center space-x-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Definir</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Candidate Modal */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display">
                  {allFunctions.find((f) => f.id === activeSlot.functionId)?.name} • {formatDateLabel(activeSlot.date)}
                </h3>
                <p className="text-xs text-slate-300">Escolha o voluntário recomendado para esta função</p>
              </div>
              <button onClick={() => setActiveSlot(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-2">
              {allFunctions.find((f) => f.id === activeSlot.functionId)?.allowsGuestEntry && (
                <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 mb-3">
                  <label className="block text-[11px] font-bold text-rose-900">
                    🌟 PARTICIPAÇÃO ESPECIAL — DIGITE O NOME (SEM CADASTRO)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={guestNameInput}
                      onChange={(e) => setGuestNameInput(e.target.value)}
                      placeholder="Ex: Pr. João (convidado)"
                      className="flex-1 px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <button
                      onClick={handleAssignGuestToSlot}
                      disabled={!guestNameInput.trim()}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-2xs shrink-0"
                    >
                      Definir
                    </button>
                  </div>
                </div>
              )}

              {activeSlotCandidates.map((cand) => (
                <div
                  key={cand.person.id}
                  onClick={() => cand.isEligible && handleAssignPersonToSlot(cand.person.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    !cand.isEligible
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-indigo-500 cursor-pointer shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{cand.person.name}</span>
                      {cand.isEligible && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          {cand.totalScore} pts
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-700 mt-0.5">
                      {cand.isEligible ? cand.reasons.join(' • ') : cand.disqualificationReason}
                    </div>
                  </div>

                  {cand.isEligible && (
                    <button className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shrink-0 ml-2">
                      Escalar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {newOrEditScheduleModal}

      <ConfirmDialog
        isOpen={!!scheduleToDelete}
        title="Excluir Escala"
        message={`Deseja realmente excluir a escala "${scheduleToDelete?.title}"? Todas as vagas e atribuições desta escala serão perdidas.`}
        onConfirm={handleConfirmDeleteSchedule}
        onCancel={() => setScheduleToDelete(null)}
      />
    </div>
  );
};
