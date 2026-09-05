import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Download,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  UserCheck,
  ShieldAlert,
  X,
  Clock,
  Heart,
  Sliders,
  Eye,
  Trash2,
  Edit,
  GraduationCap,
  PlusCircle,
  Settings
} from 'lucide-react';
import { Schedule, ScheduleSlot, Micro, MicroFunction, Person, UserAccount, ClassroomPresetKey } from '../../types';
import { storageService } from '../../services/storageService';
import { schedulerAlgorithm, CandidateScore } from '../../services/schedulerAlgorithm';
import { exportService } from '../../services/exportService';
import { formatDateBR, parseDateBRToISO } from '../../utils/dateUtils';
import { CLASSROOM_PRESETS } from '../../data/classroomPresets';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { getFunctionShiftInfo, getMicroShiftInfo } from '../../utils/functionShiftUtils';

interface MacroScheduleViewProps {
  currentUser: UserAccount;
}

export const MacroScheduleView: React.FC<MacroScheduleViewProps> = ({ currentUser }) => {
  const [schedules, setSchedules] = useState<Schedule[]>(storageService.getSchedules());
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(schedules[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);

  // New Schedule Modal State
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Escala Oficial MEVAM Kids');
  const [newEventName, setNewEventName] = useState('Cultos de Domingo');
  const [newShift, setNewShift] = useState<'MANHA' | 'NOITE' | 'AMBOS'>('NOITE');
  const [newDates, setNewDates] = useState<string[]>([
    '2026-09-06',
    '2026-09-13',
    '2026-09-20',
    '2026-09-27'
  ]);
  const [newDateInput, setNewDateInput] = useState('');
  const [selectedMicroIdsForNew, setSelectedMicroIdsForNew] = useState<string[]>(
    storageService.getMicros().map((m) => m.id)
  );

  // Edit Schedule Modal State
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editEventName, setEditEventName] = useState('');
  const [editShift, setEditShift] = useState<'MANHA' | 'NOITE' | 'AMBOS'>('NOITE');
  const [editDates, setEditDates] = useState<string[]>([]);
  const [editDateInput, setEditDateInput] = useState('');

  // Add Micro to Current Schedule Modal
  const [isAddMicroModalOpen, setIsAddMicroModalOpen] = useState(false);
  const [microIdToAdd, setMicroIdToAdd] = useState('');

  // Add Function to Micro Modal
  const [isAddFunctionModalOpen, setIsAddFunctionModalOpen] = useState(false);
  const [targetMicroForFunction, setTargetMicroForFunction] = useState<Micro | null>(null);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newFunctionCategory, setNewFunctionCategory] = useState('');
  const [newFunctionCount, setNewFunctionCount] = useState(1);
  const [newFunctionAllowedShifts, setNewFunctionAllowedShifts] = useState<string[]>(['MANHA', 'NOITE']);
  const [newFunctionSpecialEvents, setNewFunctionSpecialEvents] = useState<string>('');

  // Apply Preset Modal
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [targetMicroForPreset, setTargetMicroForPreset] = useState<Micro | null>(null);

  // Shared confirmation dialog for destructive actions in this view (replaces window.confirm)
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Slot Selection & Candidate Modal
  const [activeSlot, setActiveSlot] = useState<ScheduleSlot | null>(null);
  const [activeSlotCandidates, setActiveSlotCandidates] = useState<CandidateScore[]>([]);
  const [activeSlotExplanation, setActiveSlotExplanation] = useState<ScheduleSlot | null>(null);

  const currentSchedule = schedules.find((s) => s.id === selectedScheduleId) || schedules[0];
  const allMicros = storageService.getMicros();
  const allFunctions = storageService.getFunctions();
  const allPeople = storageService.getPeople();

  const canManage = currentUser.role === 'ADMIN_LIDERANCA' || currentUser.role === 'LIDER_MACRO';

  // Synchronize schedules when background sync fires without unmounting active modals
  useEffect(() => {
    const handleSync = () => {
      const updated = storageService.getSchedules();
      setSchedules(updated);
      setSelectedScheduleId((prev) => {
        if (!prev) return updated[0]?.id || '';
        return updated.some((s) => s.id === prev) ? prev : updated[0]?.id || '';
      });
    };
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  // Handle Generate Intelligent Schedule
  const handleRunAlgorithm = () => {
    if (!currentSchedule) return;
    setIsGenerating(true);

    setTimeout(() => {
      const result = schedulerAlgorithm.generateSchedule(currentSchedule);
      storageService.saveSchedule(result.schedule);
      setSchedules(storageService.getSchedules());
      setIsGenerating(false);
    }, 400);
  };

  // Open Candidate Picker for a Slot
  const handleOpenSlotPicker = (slot: ScheduleSlot) => {
    setActiveSlot(slot);
    const micro = allMicros.find((m) => m.id === slot.microId);
    const weights = micro?.algorithmWeights || {
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

    // Sort: Eligible first, then descending total score
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

  const handleClearSlot = (slotId: string) => {
    if (!currentSchedule) return;
    storageService.updateSlotAssignment(currentSchedule.id, slotId, undefined, true);
    setSchedules(storageService.getSchedules());
    setActiveSlot(null);
  };

  const handleCreateNewSchedule = () => {
    if (!newTitle.trim() || newDates.length === 0 || selectedMicroIdsForNew.length === 0) {
      alert('Preencha o título, selecione pelo menos uma data e ao menos um micro/setor.');
      return;
    }

    const scheduleId = `sched-${Date.now()}`;
    const slots = schedulerAlgorithm.createSlotsForSchedule(
      scheduleId,
      newDates,
      selectedMicroIdsForNew,
      newShift
    );

    const sortedDates = [...newDates].sort();

    const newSched: Schedule = {
      id: scheduleId,
      title: newTitle.trim(),
      eventName: newEventName.trim() || 'Cultos MEVAM Kids',
      period: `${formatDateBR(sortedDates[0])} até ${formatDateBR(sortedDates[sortedDates.length - 1])}`,
      shift: newShift,
      dates: sortedDates,
      microIds: selectedMicroIdsForNew,
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
    const updated = storageService.getSchedules();
    setSchedules(updated);
    setSelectedScheduleId(newSched.id);
    setIsNewScheduleModalOpen(false);
  };

  const handleOpenEditSchedule = () => {
    if (!currentSchedule) return;
    setEditTitle(currentSchedule.title);
    setEditEventName(currentSchedule.eventName || '');
    setEditShift(currentSchedule.shift);
    setEditDates([...currentSchedule.dates]);
    setEditDateInput('');
    setIsEditScheduleModalOpen(true);
  };

  const handleSaveEditSchedule = () => {
    if (!currentSchedule || !editTitle.trim() || editDates.length === 0) {
      alert('Preencha título e mantenha ao menos uma data.');
      return;
    }

    const sortedDates = [...editDates].sort();
    const updated: Schedule = {
      ...currentSchedule,
      title: editTitle.trim(),
      eventName: editEventName.trim() || undefined,
      shift: editShift,
      dates: sortedDates,
      period: `${formatDateBR(sortedDates[0])} até ${formatDateBR(sortedDates[sortedDates.length - 1])}`,
      updatedAt: new Date().toISOString()
    };

    storageService.saveSchedule(updated);
    setSchedules(storageService.getSchedules());
    setIsEditScheduleModalOpen(false);
  };

  const handleDeleteCurrentSchedule = () => {
    if (!currentSchedule) return;
    setPendingConfirm({
      title: 'Excluir Escala',
      message: `Deseja realmente excluir a escala "${currentSchedule.title}"? Todas as vagas e atribuições desta escala serão perdidas.`,
      onConfirm: () => {
        storageService.deleteSchedule(currentSchedule.id);
        const remaining = storageService.getSchedules();
        setSchedules(remaining);
        setSelectedScheduleId(remaining[0]?.id || '');
      }
    });
  };

  const handleUpdateStatus = (status: Schedule['status']) => {
    if (!currentSchedule) return;
    const updated = { ...currentSchedule, status };
    storageService.saveSchedule(updated);
    setSchedules(storageService.getSchedules());
  };

  // Add Micro / Sector to current schedule
  const handleAddMicroToSchedule = (mId: string) => {
    if (!currentSchedule || !mId) return;
    storageService.addMicroToSchedule(currentSchedule.id, mId);
    setSchedules(storageService.getSchedules());
    setIsAddMicroModalOpen(false);
  };

  // Remove Micro / Sector from current schedule
  const handleRemoveMicroFromSchedule = (mId: string, microName: string) => {
    if (!currentSchedule) return;
    setPendingConfirm({
      title: 'Remover Setor da Escala',
      message: `Deseja remover o setor "${microName}" e todas as suas vagas desta escala?`,
      onConfirm: () => {
        storageService.removeMicroFromSchedule(currentSchedule.id, mId);
        setSchedules(storageService.getSchedules());
      }
    });
  };

  // Add Function to current schedule
  const handleSaveFunctionForMicro = () => {
    if (!currentSchedule || !targetMicroForFunction || !newFunctionName.trim()) return;

    // First save the function globally if new
    const newFn: MicroFunction = {
      id: `fn-${targetMicroForFunction.id}-${Date.now()}`,
      microId: targetMicroForFunction.id,
      name: newFunctionName.trim(),
      category: newFunctionCategory.trim() || undefined,
      defaultRequiredCount: newFunctionCount,
      criteria: {
        hasAgeGroupPreference: targetMicroForFunction.name.toLowerCase().includes('prof') || targetMicroForFunction.name.toLowerCase().includes('aux'),
        hasShiftPreference: true,
        allowedShifts: newFunctionAllowedShifts,
        specialEventNames: newFunctionAllowedShifts.includes('ESPECIAL') ? newFunctionSpecialEvents.trim() : undefined,
        allowedExperienceLevels: ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
      }
    };
    storageService.saveFunction(newFn);

    // Add function slots to current schedule
    storageService.addFunctionToSchedule(currentSchedule.id, newFn);
    setSchedules(storageService.getSchedules());
    setIsAddFunctionModalOpen(false);
    setNewFunctionName('');
    setNewFunctionCategory('');
    setNewFunctionCount(1);
    setNewFunctionAllowedShifts(['MANHA', 'NOITE']);
    setNewFunctionSpecialEvents('');
    setTargetMicroForFunction(null);
  };

  // Remove Function from current schedule
  const handleRemoveFunctionFromSchedule = (_microId: string, fnId: string, fnName: string) => {
    if (!currentSchedule) return;
    setPendingConfirm({
      title: 'Remover Função da Escala',
      message: `Deseja remover a função "${fnName}" desta escala?`,
      onConfirm: () => {
        storageService.removeFunctionFromSchedule(currentSchedule.id, fnId);
        setSchedules(storageService.getSchedules());
      }
    });
  };

  // Add extra slot for a function
  const handleAddSlotForFunction = (_microId: string, functionId: string) => {
    if (!currentSchedule) return;
    storageService.addExtraSlotToSchedule(currentSchedule.id, functionId);
    setSchedules(storageService.getSchedules());
  };

  // Apply Classroom Preset to Micro inside this schedule
  const handleApplyPreset = (presetKey: ClassroomPresetKey) => {
    if (!currentSchedule || !targetMicroForPreset) return;
    const preset = CLASSROOM_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;

    const isAux = targetMicroForPreset.name.toLowerCase().includes('aux');
    const prefix = isAux ? 'Auxiliar' : 'Professor(a)';

    preset.ageGroups.forEach((age, idx) => {
      const fnName = `${prefix} ${age}`;
      // Check if function already exists
      let existingFn = allFunctions.find((f) => f.microId === targetMicroForPreset.id && f.name === fnName);
      if (!existingFn) {
        existingFn = {
          id: `fn-${targetMicroForPreset.id}-${presetKey.toLowerCase()}-${idx + 1}-${Date.now()}`,
          microId: targetMicroForPreset.id,
          name: fnName,
          category: `Turma ${age}`,
          defaultRequiredCount: 1,
          criteria: {
            hasAgeGroupPreference: true,
            allowedAgeGroups: [age],
            hasShiftPreference: true,
            allowedExperienceLevels: ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
          }
        };
        storageService.saveFunction(existingFn);
      }

      // Add to schedule
      storageService.addFunctionToSchedule(currentSchedule.id, existingFn);
    });

    setSchedules(storageService.getSchedules());
    setIsPresetModalOpen(false);
    setTargetMicroForPreset(null);
  };

  // Defined once and reused both by the "no schedules yet" empty state below and by
  // the main grid view, since a fresh install has zero schedules and must still be
  // able to reach this modal from the empty state's "Criar Primeira Escala" button.
  const newScheduleModal = isNewScheduleModalOpen && (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
        <h3 className="text-base font-bold text-slate-900 font-display">
          Criar Nova Escala MEVAM Kids
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">TÍTULO DA ESCALA *</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Escala Oficial MEVAM Kids - Outubro"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">EVENTO / CULTO</label>
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Ex: Cultos de Domingo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">TURNO PRINCIPAL</label>
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="NOITE">Noite (18h / 19h)</option>
                <option value="MANHA">Manhã (09h / 10h)</option>
                <option value="AMBOS">Todos os Turnos</option>
              </select>
            </div>
          </div>

          {/* Dates Selector in Brazilian Format */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">DATAS DO PERÍODO (PADRÃO BRASIL)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {newDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center space-x-1 text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold"
                >
                  <span>{formatDateBR(d)}</span>
                  <button
                    type="button"
                    onClick={() => setNewDates(newDates.filter((x) => x !== d))}
                    className="text-blue-400 hover:text-blue-700 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (newDateInput && !newDates.includes(newDateInput)) {
                    setNewDates([...newDates, newDateInput]);
                    setNewDateInput('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg"
              >
                + Adicionar Data
              </button>
            </div>
          </div>

          {/* Micros Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">MICROS / SETORES NESTA ESCALA</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allMicros.map((m) => {
                const isChecked = selectedMicroIdsForNew.includes(m.id);
                const shiftInfo = getMicroShiftInfo(m);
                return (
                  <label
                    key={m.id}
                    className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between space-x-1.5 text-xs font-semibold ${
                      isChecked ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMicroIdsForNew([...selectedMicroIdsForNew, m.id]);
                          } else {
                            setSelectedMicroIdsForNew(selectedMicroIdsForNew.filter((id) => id !== m.id));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-600 shrink-0"
                      />
                      <span className="truncate">{m.name}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${shiftInfo.badgeClass}`}>
                      {shiftInfo.badgeText}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={() => setIsNewScheduleModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateNewSchedule}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Criar Grade de Escala
          </button>
        </div>
      </div>
    </div>
  );

  if (!currentSchedule) {
    return (
      <div className="space-y-6">
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 font-display">Nenhuma escala cadastrada</h2>
            <p className="text-xs text-slate-600 mt-1">Crie a primeira grade de escala macro do MEVAM Kids.</p>
          </div>
          <button
            onClick={() => setIsNewScheduleModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            + Criar Primeira Escala
          </button>
        </div>

        {/* This modal must also be reachable from the empty state above, not only once
            a schedule already exists — otherwise a fresh install can never create its
            first schedule. */}
        {newScheduleModal}
      </div>
    );
  }

  const activeMicros = allMicros.filter((m) => currentSchedule.microIds.includes(m.id));
  const availableMicrosToAdd = allMicros.filter((m) => !currentSchedule.microIds.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md uppercase tracking-wider">
                ESCALA MACRO GERAL
              </span>
              <span className="text-xs text-slate-600 font-semibold">
                Turno: {currentSchedule.shift} • {currentSchedule.dates.length} Cultos ({currentSchedule.period})
              </span>
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 font-display tracking-tight">
                {currentSchedule.title}
              </h1>
              {schedules.length > 1 && (
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({formatDateBR(s.dates[0])})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-slate-600">
              {currentSchedule.eventName} — Matriz integrada de todos os setores e funções do MEVAM Kids
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <select
              value={currentSchedule.status}
              onChange={(e) => handleUpdateStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="RASCUNHO">📝 Rascunho</option>
              <option value="EM_REVISAO">🔍 Em Revisão</option>
              <option value="CONFIRMADA">✅ Confirmada</option>
              <option value="PUBLICADA">🚀 Publicada</option>
              <option value="CANCELADA">❌ Cancelada</option>
            </select>

            {/* Run Algorithm Button */}
            <button
              onClick={handleRunAlgorithm}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 active:scale-[0.98]"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Calculando Escala...' : 'ASSISTENTE INTELIGENTE'}</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={() => exportService.exportToExcel(currentSchedule)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              title="Exportar Planilha Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={() => exportService.exportToPDF(currentSchedule)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              title="Exportar Documento PDF (.pdf)"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>PDF</span>
            </button>

            {/* Edit Schedule Button */}
            {canManage && (
              <button
                onClick={handleOpenEditSchedule}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                title="Editar Dados da Escala"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {/* Delete Schedule Button */}
            {canManage && schedules.length > 1 && (
              <button
                onClick={handleDeleteCurrentSchedule}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200"
                title="Excluir esta Escala"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* New Schedule Button */}
            <button
              onClick={() => setIsNewScheduleModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1"
              title="Criar Nova Escala"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Escala</span>
            </button>
          </div>
        </div>

        {/* Quality Metrics Bar */}
        {currentSchedule.qualityMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-600 block">Preenchimento:</span>
              <span className="text-sm font-extrabold text-slate-900">
                {currentSchedule.qualityMetrics.filledPercent}%
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-600 block">Disponibilidade:</span>
              <span className="text-sm font-extrabold text-emerald-700">
                {currentSchedule.qualityMetrics.availabilityPercent}%
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-600 block">Equilíbrio Frequência:</span>
              <span className="text-sm font-extrabold text-blue-700">
                {currentSchedule.qualityMetrics.balancePercent}%
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-600 block">Rodízio Parceiros:</span>
              <span className="text-sm font-extrabold text-purple-700">
                {currentSchedule.qualityMetrics.rotationPercent}%
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-600 block">Vínculos Familiares:</span>
              <span className="text-sm font-extrabold text-rose-700">
                {currentSchedule.qualityMetrics.familyPercent}%
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-600 block">Preferências:</span>
              <span className="text-sm font-extrabold text-amber-700">
                {currentSchedule.qualityMetrics.preferencePercent}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Matrix Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Table Header: Dates in Brazilian Format */}
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold border-b border-slate-800">
                <th className="py-3.5 px-4 w-72 uppercase tracking-wider">
                  SETOR / FUNÇÃO
                </th>
                {currentSchedule.dates.map((date) => (
                  <th key={date} className="py-3.5 px-4 text-center font-extrabold tracking-tight">
                    <div>{formatDateBR(date)}</div>
                    <span className="text-[10px] font-normal text-slate-400">Domingo</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {activeMicros.map((micro) => {
                // Find all unique functions present in current schedule slots for this micro, or in allFunctions
                const slotsInMicro = currentSchedule.slots.filter((s) => s.microId === micro.id);
                const uniqueFunctionIds = Array.from(new Set(slotsInMicro.map((s) => s.functionId)));
                
                // Fallback: If no slots yet, get micro functions
                const microFunctions = uniqueFunctionIds.length > 0
                  ? uniqueFunctionIds.map((id) => allFunctions.find((f) => f.id === id)).filter(Boolean) as MicroFunction[]
                  : allFunctions.filter((f) => f.microId === micro.id);

                const isTeacherOrAux = micro.name.toLowerCase().includes('prof') || micro.name.toLowerCase().includes('aux');

                return (
                  <React.Fragment key={micro.id}>
                    {/* Micro Section Banner Row with inline management */}
                    <tr
                      className="text-white font-extrabold text-xs"
                      style={{ backgroundColor: micro.color }}
                    >
                      <td
                        colSpan={currentSchedule.dates.length + 1}
                        className="py-2.5 px-4 tracking-wider uppercase font-display"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold">[ {micro.name.toUpperCase()} ]</span>
                            {(() => {
                              const microShift = getMicroShiftInfo(micro);
                              return (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                                  {microShift.badgeText}
                                </span>
                              );
                            })()}
                          </div>

                          {canManage && (
                            <div className="flex items-center space-x-1.5 font-normal">
                              {isTeacherOrAux && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetMicroForPreset(micro);
                                    setIsPresetModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded-md flex items-center space-x-1 transition-colors"
                                  title="Aplicar Predefinição de Turmas MEVAM Kids"
                                >
                                  <GraduationCap className="w-3.5 h-3.5" />
                                  <span>Predefinição de Turmas</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setTargetMicroForFunction(micro);
                                  setNewFunctionName('');
                                  setNewFunctionCategory('');
                                  setNewFunctionCount(1);
                                  const microShifts = micro.defaultShifts && micro.defaultShifts.length > 0
                                    ? micro.defaultShifts
                                    : (micro.name.toLowerCase().includes('louvor') ? ['NOITE'] : ['MANHA', 'NOITE']);
                                  setNewFunctionAllowedShifts(microShifts);
                                  setNewFunctionSpecialEvents(micro.specialEventNames || '');
                                  setIsAddFunctionModalOpen(true);
                                }}
                                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold rounded-md flex items-center space-x-1 transition-colors"
                                title="Adicionar Função a este Setor na Escala"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Adicionar Função</span>
                              </button>

                              {activeMicros.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMicroFromSchedule(micro.id, micro.name)}
                                  className="px-2 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 text-[11px] font-bold rounded-md flex items-center space-x-1 transition-colors"
                                  title="Remover este Setor da Escala"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remover Setor</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Function Rows */}
                    {microFunctions.length === 0 ? (
                      <tr>
                        <td colSpan={currentSchedule.dates.length + 1} className="py-3 px-4 text-center text-slate-400 italic">
                          Nenhuma função neste setor. Clique em "+ Adicionar Função" ou "Predefinição de Turmas".
                        </td>
                      </tr>
                    ) : (
                      microFunctions.map((fn) => {
                        const slotsForFn = slotsInMicro.filter((s) => s.functionId === fn.id);
                        const maxSlotIndex = Math.max(
                          ...slotsForFn.map((s) => s.slotIndex || 1),
                          fn.defaultRequiredCount || 1
                        );

                        return Array.from({ length: maxSlotIndex }).map((_, slotIdx) => {
                          const slotIndexNumber = slotIdx + 1;
                          const functionLabel = maxSlotIndex > 1 ? `${fn.name} (Vaga ${slotIndexNumber})` : fn.name;

                          return (
                            <tr key={`${fn.id}-${slotIndexNumber}`} className="hover:bg-slate-50/70 transition-colors group">
                              {/* Row Label & Actions */}
                              <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: micro.color }} />
                                    <span>{functionLabel}</span>
                                    {(() => {
                                      const sInfo = getFunctionShiftInfo(fn);
                                      return (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${sInfo.badgeClass}`}>
                                          {sInfo.badgeText}
                                        </span>
                                      );
                                    })()}
                                  </div>

                                  {canManage && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleAddSlotForFunction(micro.id, fn.id)}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                        title="Adicionar mais uma vaga a esta função"
                                      >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFunctionFromSchedule(micro.id, fn.id, fn.name)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                        title="Remover esta função da escala"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Date Assignment Slots */}
                              {currentSchedule.dates.map((date) => {
                                const slot = currentSchedule.slots.find(
                                  (s) =>
                                    s.microId === micro.id &&
                                    s.functionId === fn.id &&
                                    s.date === date &&
                                    s.slotIndex === slotIndexNumber
                                );

                                if (!slot) {
                                  return <td key={date} className="p-2 border-r border-slate-100 text-center text-slate-300">-</td>;
                                }

                                const isAssigned = !!slot.assignedPersonId;

                                return (
                                  <td
                                    key={date}
                                    className="p-2 border-r border-slate-100 align-middle"
                                  >
                                    {isAssigned ? (
                                      <div className="group relative">
                                        <div
                                          onClick={() => handleOpenSlotPicker(slot)}
                                          className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between shadow-2xs ${
                                            slot.manualOverride
                                              ? 'bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100'
                                              : 'bg-blue-50/70 border-blue-200 text-blue-950 hover:bg-blue-100'
                                          }`}
                                        >
                                          <span className="truncate pr-1">{slot.assignedPersonName}</span>

                                          {slot.scoreBreakdown && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveSlotExplanation(slot);
                                              }}
                                              className="p-1 text-blue-600 hover:text-blue-900 rounded shrink-0"
                                              title="Ver justificativa do assistente"
                                            >
                                              <Info className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenSlotPicker(slot)}
                                        className="w-full py-2 px-2 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center space-x-1"
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
                      })
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Sector Ribbon at table bottom */}
        {canManage && availableMicrosToAdd.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              Há {availableMicrosToAdd.length} frentes/micros disponíveis que não estão nesta escala.
            </span>
            <button
              type="button"
              onClick={() => setIsAddMicroModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar Setor à Escala</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Slot Assignment & Candidate Ranking */}
      {activeSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded uppercase">
                  Atribuição de Voluntário
                </span>
                <h3 className="text-base font-bold font-display mt-1">
                  {allFunctions.find((f) => f.id === activeSlot.functionId)?.name} • {formatDateBR(activeSlot.date)}
                </h3>
                <p className="text-xs text-slate-300">
                  Micro: {allMicros.find((m) => m.id === activeSlot.microId)?.name}
                </p>
              </div>

              <button
                onClick={() => setActiveSlot(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-2">
              {activeSlot.assignedPersonId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs mb-3">
                  <span className="text-slate-700">
                    Atribuído atualmente: <strong>{activeSlot.assignedPersonName}</strong>
                  </span>
                  <button
                    onClick={() => handleClearSlot(activeSlot.id)}
                    className="text-rose-600 hover:text-rose-800 font-bold"
                  >
                    Desocupar Vaga
                  </button>
                </div>
              )}

              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pb-1">
                Voluntários Habilitados & Classificação Inteligente:
              </div>

              {activeSlotCandidates.map((cand) => {
                const isCurrent = cand.person.id === activeSlot.assignedPersonId;

                return (
                  <div
                    key={cand.person.id}
                    onClick={() => cand.isEligible && handleAssignPersonToSlot(cand.person.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      !cand.isEligible
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : isCurrent
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs cursor-pointer'
                        : 'border-slate-200 hover:border-blue-500 bg-white cursor-pointer hover:shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{cand.person.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                            Atual
                          </span>
                        )}
                        {cand.isEligible && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                            Score: {cand.totalScore} pts
                          </span>
                        )}
                      </div>

                      {cand.isEligible ? (
                        <div className="text-[11px] text-slate-600 line-clamp-1">
                          {cand.reasons.join(' • ')}
                        </div>
                      ) : (
                        <div className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>{cand.disqualificationReason}</span>
                        </div>
                      )}
                    </div>

                    {cand.isEligible && (
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs shrink-0 ml-2">
                        Escalar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Score Explanation ("Por que esta pessoa foi escolhida?") */}
      {activeSlotExplanation && activeSlotExplanation.scoreBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Por que esta pessoa foi escolhida?</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display mt-0.5">
                  {activeSlotExplanation.assignedPersonName}
                </h3>
              </div>
              <button
                onClick={() => setActiveSlotExplanation(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 font-extrabold text-blue-950 flex justify-between">
                <span>Pontuação Final Consolidada:</span>
                <span>{activeSlotExplanation.scoreBreakdown.totalScore} / 100 pts</span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                  Critérios Atendidos:
                </div>
                {activeSlotExplanation.scoreBreakdown.reasons.map((r, i) => (
                  <div key={i} className="flex items-center space-x-2 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveSlotExplanation(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Schedule */}
      {newScheduleModal}

      {/* Modal: Edit Current Schedule */}
      {isEditScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Editar Dados da Escala
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">TÍTULO DA ESCALA *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">EVENTO / CULTO</label>
                  <input
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TURNO PRINCIPAL</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="NOITE">Noite (18h / 19h)</option>
                    <option value="MANHA">Manhã (09h / 10h)</option>
                    <option value="AMBOS">Todos os Turnos</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">DATAS DO PERÍODO</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editDates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center space-x-1 text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 font-semibold"
                    >
                      <span>{formatDateBR(d)}</span>
                      {editDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditDates(editDates.filter((x) => x !== d))}
                          className="text-blue-400 hover:text-blue-700 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={editDateInput}
                    onChange={(e) => setEditDateInput(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editDateInput && !editDates.includes(editDateInput)) {
                        setEditDates([...editDates, editDateInput]);
                        setEditDateInput('');
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
                onClick={() => setIsEditScheduleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditSchedule}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Micro to Current Schedule */}
      {isAddMicroModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Adicionar Setor à Escala
            </h3>

            <p className="text-xs text-slate-600">
              Selecione o setor/frente para incluir na grade de culto atual:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableMicrosToAdd.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleAddMicroToSchedule(m.id)}
                  className="p-3 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="font-bold text-xs text-slate-900">{m.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600">+ Incluir</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAddMicroModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Function to Micro in Current Schedule */}
      {isAddFunctionModalOpen && targetMicroForFunction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Adicionar Função em {targetMicroForFunction.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NOME DA FUNÇÃO *</label>
                <input
                  type="text"
                  value={newFunctionName}
                  onChange={(e) => setNewFunctionName(e.target.value)}
                  placeholder="Ex: Professor 9 e 10 anos, Bateria, Recepção..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CATEGORIA (OPCIONAL)</label>
                <input
                  type="text"
                  value={newFunctionCategory}
                  onChange={(e) => setNewFunctionCategory(e.target.value)}
                  placeholder="Ex: Turmas de Idade, Louvor, Apoio..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">VAGAS NECESSÁRIAS POR CULTO</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newFunctionCount}
                  onChange={(e) => setNewFunctionCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Turnos / Cultos de Atuação */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Turnos de Atuação desta Função *
                </label>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewFunctionAllowedShifts(['NOITE'])}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      newFunctionAllowedShifts.length === 1 && newFunctionAllowedShifts.includes('NOITE')
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-indigo-700 border-indigo-200'
                    }`}
                  >
                    🌙 Só Noite
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFunctionAllowedShifts(['MANHA'])}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      newFunctionAllowedShifts.length === 1 && newFunctionAllowedShifts.includes('MANHA')
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-700 border-amber-200'
                    }`}
                  >
                    ☀️ Só Manhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewFunctionAllowedShifts(['MANHA', 'NOITE'])}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      newFunctionAllowedShifts.length === 2 && newFunctionAllowedShifts.includes('MANHA') && newFunctionAllowedShifts.includes('NOITE')
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-700 border-blue-200'
                    }`}
                  >
                    ☀️🌙 Manhã & Noite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewFunctionAllowedShifts(['ESPECIAL']);
                      if (!newFunctionSpecialEvents) setNewFunctionSpecialEvents('Culto de Casais, Culto de Mulheres');
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      newFunctionAllowedShifts.length === 1 && newFunctionAllowedShifts.includes('ESPECIAL')
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-purple-700 border-purple-200'
                    }`}
                  >
                    ⭐ Só Especiais
                  </button>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={newFunctionAllowedShifts.includes('MANHA')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...newFunctionAllowedShifts, 'MANHA']
                          : newFunctionAllowedShifts.filter((s) => s !== 'MANHA');
                        setNewFunctionAllowedShifts(next.length > 0 ? next : ['MANHA']);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">☀️ Culto da Manhã (09h / 10h)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={newFunctionAllowedShifts.includes('NOITE')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...newFunctionAllowedShifts, 'NOITE']
                          : newFunctionAllowedShifts.filter((s) => s !== 'NOITE');
                        setNewFunctionAllowedShifts(next.length > 0 ? next : ['NOITE']);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">🌙 Culto da Noite (18h / 19h - ex: Louvor)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={newFunctionAllowedShifts.includes('ESPECIAL')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...newFunctionAllowedShifts, 'ESPECIAL']
                          : newFunctionAllowedShifts.filter((s) => s !== 'ESPECIAL');
                        setNewFunctionAllowedShifts(next.length > 0 ? next : ['ESPECIAL']);
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">⭐ Cultos Especiais (Casais, Mulheres...)</span>
                  </label>

                  {newFunctionAllowedShifts.includes('ESPECIAL') && (
                    <input
                      type="text"
                      value={newFunctionSpecialEvents}
                      onChange={(e) => setNewFunctionSpecialEvents(e.target.value)}
                      placeholder="Quais cultos especiais? Ex: Casais, Mulheres"
                      className="w-full px-2 py-1 bg-white border border-purple-200 rounded text-xs font-medium focus:outline-hidden"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setIsAddFunctionModalOpen(false);
                  setTargetMicroForFunction(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFunctionForMicro}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Adicionar Função
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Classroom Presets for Micro */}
      {isPresetModalOpen && targetMicroForPreset && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center space-x-3 text-blue-600">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Predefinições de Turmas MEVAM Kids
                </h3>
                <p className="text-xs text-slate-600">
                  Adicione as funções de turmas diretamente para {targetMicroForPreset.name}:
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {CLASSROOM_PRESETS.map((preset) => (
                <div
                  key={preset.key}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{preset.label}</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset.key)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs"
                    >
                      + Aplicar a esta Escala
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600">{preset.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {preset.ageGroups.map((age) => (
                      <span
                        key={age}
                        className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                      >
                        {age}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setIsPresetModalOpen(false);
                  setTargetMicroForPreset(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pendingConfirm}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          pendingConfirm?.onConfirm();
          setPendingConfirm(null);
        }}
      />
    </div>
  );
};
