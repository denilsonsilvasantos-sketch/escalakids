import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Sliders,
  CheckCircle2,
  Check,
  Settings,
  Layers,
  ChevronRight,
  Sparkles,
  Users,
  AlertTriangle,
  GraduationCap,
  Sun,
  Moon,
  Star,
  Calendar,
  ChevronUp,
  ChevronDown,
  Mic,
  Guitar,
  Piano,
  Drum,
  Volume2,
  Popcorn,
  ShieldCheck,
  Camera,
  HeartHandshake,
  Drama,
  UtensilsCrossed,
  Crown,
  Music2
} from 'lucide-react';
import { Micro, MicroFunction, UserAccount, AlgorithmWeights, ClassroomPresetKey, FunctionConflictGroup } from '../../types';
import { storageService } from '../../services/storageService';
import { CLASSROOM_PRESETS, generateFunctionsForPreset } from '../../data/classroomPresets';
import { getFunctionIconKey, FunctionIconKey } from '../../utils/functionIcons';

const FUNCTION_ICON_COMPONENTS: Record<FunctionIconKey, React.ComponentType<{ className?: string }>> = {
  mic: Mic,
  guitar: Guitar,
  piano: Piano,
  drum: Drum,
  volume: Volume2,
  graduation: GraduationCap,
  users: Users,
  popcorn: Popcorn,
  shield: ShieldCheck,
  camera: Camera,
  heart: HeartHandshake,
  drama: Drama,
  utensils: UtensilsCrossed,
  crown: Crown,
  star: Star,
  music: Music2
};

const FunctionIcon: React.FC<{ fn: { name: string; category?: string }; className?: string }> = ({ fn, className }) => {
  const Icon = FUNCTION_ICON_COMPONENTS[getFunctionIconKey(fn)];
  return <Icon className={className} />;
};
import { getFunctionShiftInfo, getMicroShiftInfo } from '../../utils/functionShiftUtils';

interface MicroManagementProps {
  currentUser: UserAccount;
}

export const MicroManagement: React.FC<MicroManagementProps> = ({ currentUser }) => {
  const [micros, setMicros] = useState<Micro[]>(storageService.getMicros());
  // A micro leader only manages their own frente and shouldn't see how other
  // frentes are configured at all; a macro leader only the ones granted to
  // them. Only admin/coordenador see everything — matches canAccessMicro's
  // scoping used elsewhere (schedules, volunteer list, etc.).
  const visibleMicros = micros.filter((m) => storageService.canAccessMicro(m.id, currentUser));
  const [selectedMicro, setSelectedMicro] = useState<Micro>(visibleMicros[0] || null);
  const [functions, setFunctions] = useState<MicroFunction[]>(storageService.getFunctions());

  // Edit / New Micro Modal state
  const [isMicroModalOpen, setIsMicroModalOpen] = useState(false);
  const [editingMicro, setEditingMicro] = useState<Micro | null>(null);
  const [microName, setMicroName] = useState('');
  const [microColor, setMicroColor] = useState('#2563eb');
  const [microDesc, setMicroDesc] = useState('');
  const [microAllowedShifts, setMicroAllowedShifts] = useState<string[]>(['MANHA', 'NOITE']);
  const [microSpecialEvents, setMicroSpecialEvents] = useState<string>('');
  const [microApplyToFunctions, setMicroApplyToFunctions] = useState<boolean>(false);

  // Delete Micro Confirmation Modal state
  const [isDeleteMicroModalOpen, setIsDeleteMicroModalOpen] = useState(false);
  const [microToDelete, setMicroToDelete] = useState<Micro | null>(null);

  // Preset Classroom Modal
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // Algorithm Weights state for selected micro
  const [weights, setWeights] = useState<AlgorithmWeights>(
    selectedMicro?.algorithmWeights || {
      availability: 100,
      correctFunction: 100,
      volunteerPreference: 80,
      frequencyBalance: 90,
      recency: 80,
      rotation: 80,
      family: 60,
      experience: 50
    }
  );

  // New / Edit Function Modal state
  const [isFnModalOpen, setIsFnModalOpen] = useState(false);
  const [editingFn, setEditingFn] = useState<MicroFunction | null>(null);
  const [fnToDelete, setFnToDelete] = useState<MicroFunction | null>(null);
  const [fnName, setFnName] = useState('');
  const [fnCategory, setFnCategory] = useState('');
  const [fnCount, setFnCount] = useState<number>(1);
  const [hasAgePref, setHasAgePref] = useState(false);
  const [hasShiftPref, setHasShiftPref] = useState(false);
  const [fnAllowedShifts, setFnAllowedShifts] = useState<string[]>(['MANHA', 'NOITE']);
  const [fnSpecialEvents, setFnSpecialEvents] = useState<string>('');
  const [fnConflictGroup, setFnConflictGroup] = useState<FunctionConflictGroup | ''>('');
  const [fnAllowsGuestEntry, setFnAllowsGuestEntry] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync listener to update micros/functions when storage changes without destroying open modals
  useEffect(() => {
    const handleSync = () => {
      const updatedMicros = storageService.getMicros();
      const updatedFunctions = storageService.getFunctions();
      setMicros(updatedMicros);
      setFunctions(updatedFunctions);
      const updatedVisibleMicros = updatedMicros.filter((m) => storageService.canAccessMicro(m.id, currentUser));
      setSelectedMicro((prev) => {
        if (!prev) return updatedVisibleMicros[0] || null;
        return updatedVisibleMicros.find((m) => m.id === prev.id) || updatedVisibleMicros[0] || null;
      });
    };
    window.addEventListener('mevam_data_synced', handleSync);
    return () => window.removeEventListener('mevam_data_synced', handleSync);
  }, []);

  const canEdit = currentUser.role === 'ADMIN_LIDERANCA' || storageService.canAccessMicro(selectedMicro?.id || '', currentUser);

  const handleSelectMicro = (m: Micro) => {
    setSelectedMicro(m);
    setWeights(
      m.algorithmWeights || {
        availability: 100,
        correctFunction: 100,
        volunteerPreference: 80,
        frequencyBalance: 90,
        recency: 80,
        rotation: 80,
        family: 60,
        experience: 50
      }
    );
  };

  const handleOpenNewMicro = () => {
    setEditingMicro(null);
    setMicroName('');
    setMicroColor('#2563eb');
    setMicroDesc('');
    setMicroAllowedShifts(['MANHA', 'NOITE']);
    setMicroSpecialEvents('');
    setMicroApplyToFunctions(false);
    setIsMicroModalOpen(true);
  };

  const handleOpenEditMicro = (m: Micro) => {
    setEditingMicro(m);
    setMicroName(m.name);
    setMicroColor(m.color);
    setMicroDesc(m.description || '');
    const currentShifts = m.defaultShifts && m.defaultShifts.length > 0
      ? m.defaultShifts
      : (m.name.toLowerCase().includes('louvor') ? ['NOITE'] : ['MANHA', 'NOITE']);
    setMicroAllowedShifts(currentShifts);
    setMicroSpecialEvents(m.specialEventNames || '');
    setMicroApplyToFunctions(false);
    setIsMicroModalOpen(true);
  };

  const handleQuickChangeMicroPeriod = (m: Micro, shifts: string[], specialEventNames?: string) => {
    const updated = storageService.updateMicroPeriod(m.id, shifts, specialEventNames, true);
    if (updated) {
      const updatedMicros = storageService.getMicros();
      setMicros(updatedMicros);
      setSelectedMicro(updated);
      setFunctions(storageService.getFunctions());
      const shiftInfo = getMicroShiftInfo(updated);
      setToastMessage(`Período da frente "${updated.name}" alterado para ${shiftInfo.badgeText} e sincronizado com as funções!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleReplicatePeriodToFunctions = (m: Micro) => {
    const currentShifts = m.defaultShifts && m.defaultShifts.length > 0
      ? m.defaultShifts
      : (m.name.toLowerCase().includes('louvor') ? ['NOITE'] : ['MANHA', 'NOITE']);

    storageService.saveMicro({
      ...m,
      defaultShifts: currentShifts,
      specialEventNames: m.specialEventNames
    }, true);

    setFunctions(storageService.getFunctions());
    const count = storageService.getFunctions().filter((f) => f.microId === m.id).length;
    setToastMessage(`Período sincronizado com sucesso em todas as ${count} funções da frente "${m.name}"!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveMicro = () => {
    if (!microName.trim()) return;

    const shifts = microAllowedShifts.length > 0 ? microAllowedShifts : ['MANHA', 'NOITE'];
    const microToSave: Micro = {
      id: editingMicro?.id || `micro-${Date.now()}`,
      name: microName.trim(),
      color: microColor,
      description: microDesc.trim() || undefined,
      defaultShifts: shifts,
      specialEventNames: shifts.includes('ESPECIAL') ? microSpecialEvents.trim() : undefined,
      status: 'ATIVO',
      createdAt: editingMicro?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      algorithmWeights: editingMicro?.algorithmWeights || weights
    };

    storageService.saveMicro(microToSave, microApplyToFunctions);
    const updated = storageService.getMicros();
    setMicros(updated);
    setSelectedMicro(microToSave);
    if (microApplyToFunctions) {
      setFunctions(storageService.getFunctions());
      const countFns = storageService.getFunctions().filter((f) => f.microId === microToSave.id).length;
      setToastMessage(`Frente "${microToSave.name}" salva e período aplicado às ${countFns} funções!`);
    } else {
      setToastMessage(`Frente "${microToSave.name}" salva com sucesso!`);
    }
    setIsMicroModalOpen(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePromptDeleteMicro = (m: Micro) => {
    setMicroToDelete(m);
    setIsDeleteMicroModalOpen(true);
  };

  const handleConfirmDeleteMicro = () => {
    if (!microToDelete) return;
    storageService.deleteMicro(microToDelete.id);
    const updatedMicros = storageService.getMicros();
    setMicros(updatedMicros);
    setFunctions(storageService.getFunctions());
    setSelectedMicro(updatedMicros[0] || null);
    setIsDeleteMicroModalOpen(false);
    setMicroToDelete(null);
  };

  const handleApplyPresetToSelectedMicro = (presetKey: ClassroomPresetKey) => {
    if (!selectedMicro) return;
    const preset = CLASSROOM_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;

    // Create functions for this micro based on preset
    const isAux = selectedMicro.name.toLowerCase().includes('aux');
    const prefix = isAux ? 'Auxiliar' : 'Professor(a)';

    preset.ageGroups.forEach((age, idx) => {
      const newFn: MicroFunction = {
        id: `fn-${selectedMicro.id}-${presetKey.toLowerCase()}-${idx + 1}-${Date.now()}`,
        microId: selectedMicro.id,
        name: `${prefix} ${age}`,
        category: `Turma ${age}`,
        defaultRequiredCount: 1,
        criteria: {
          hasAgeGroupPreference: true,
          allowedAgeGroups: [age],
          hasShiftPreference: true,
          allowedExperienceLevels: ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
        }
      };
      storageService.saveFunction(newFn);
    });

    setFunctions(storageService.getFunctions());
    setIsPresetModalOpen(false);
  };

  const handleSaveWeights = () => {
    if (!selectedMicro) return;
    const updatedMicro: Micro = {
      ...selectedMicro,
      algorithmWeights: weights
    };
    storageService.saveMicro(updatedMicro);
    setSelectedMicro(updatedMicro);
    setToastMessage(`Critérios e pesos salvos com sucesso para ${selectedMicro.name}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenNewFunction = () => {
    setEditingFn(null);
    setFnName('');
    setFnCategory('');
    setFnCount(1);
    setHasAgePref(selectedMicro?.name.toLowerCase().includes('prof') || selectedMicro?.name.toLowerCase().includes('aux'));
    setHasShiftPref(true);

    const microShifts = selectedMicro?.defaultShifts && selectedMicro.defaultShifts.length > 0
      ? selectedMicro.defaultShifts
      : (selectedMicro?.name.toLowerCase().includes('louvor') ? ['NOITE'] : ['MANHA', 'NOITE']);
    setFnAllowedShifts(microShifts);
    setFnSpecialEvents(selectedMicro?.specialEventNames || '');
    setFnConflictGroup('');
    setFnAllowsGuestEntry(false);
    setIsFnModalOpen(true);
  };

  const handleOpenEditFunction = (fn: MicroFunction) => {
    setEditingFn(fn);
    setFnName(fn.name);
    setFnCategory(fn.category || '');
    setFnCount(fn.defaultRequiredCount || 1);
    setHasAgePref(!!fn.criteria?.hasAgeGroupPreference);
    setHasShiftPref(!!fn.criteria?.hasShiftPreference);

    const existingShifts = fn.criteria?.allowedShifts && fn.criteria.allowedShifts.length > 0
      ? fn.criteria.allowedShifts
      : ['MANHA', 'NOITE'];
    setFnAllowedShifts(existingShifts);
    setFnSpecialEvents(fn.criteria?.specialEventNames || '');
    setFnConflictGroup(fn.conflictGroup || '');
    setFnAllowsGuestEntry(!!fn.allowsGuestEntry);
    setIsFnModalOpen(true);
  };

  const handleSaveFunction = () => {
    if (!fnName.trim() || !selectedMicro) return;

    const fnToSave: MicroFunction = {
      id: editingFn?.id || `fn-${Date.now()}`,
      microId: selectedMicro.id,
      name: fnName.trim(),
      category: fnCategory.trim() || undefined,
      defaultRequiredCount: fnCount,
      conflictGroup: isLouvorMicro ? (fnConflictGroup || undefined) : undefined,
      allowsGuestEntry: fnAllowsGuestEntry,
      criteria: {
        hasAgeGroupPreference: hasAgePref,
        hasShiftPreference: hasShiftPref,
        allowedShifts: fnAllowedShifts,
        specialEventNames: fnAllowedShifts.includes('ESPECIAL') ? fnSpecialEvents.trim() : undefined,
        allowedExperienceLevels: ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
      }
    };

    storageService.saveFunction(fnToSave);
    setFunctions(storageService.getFunctions());
    setIsFnModalOpen(false);
    setToastMessage(`Função "${fnToSave.name}" salva com sucesso!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmDeleteFunction = () => {
    if (!fnToDelete) return;
    const name = fnToDelete.name;
    storageService.deleteFunction(fnToDelete.id);
    setFunctions(storageService.getFunctions());
    setFnToDelete(null);
    setToastMessage(`Função "${name}" excluída.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const microFunctions = functions.filter((f) => f.microId === selectedMicro?.id);
  const peopleInMicro = storageService.getPeople().filter((p) => p.microIds.includes(selectedMicro?.id || ''));
  const isTeacherOrAux = selectedMicro?.name.toLowerCase().includes('prof') || selectedMicro?.name.toLowerCase().includes('aux');
  const isLouvorMicro = !!selectedMicro?.name.toLowerCase().includes('louvor');

  const handleMoveFunction = (fnId: string, direction: 'up' | 'down') => {
    storageService.moveFunctionOrder(fnId, direction);
    setFunctions(storageService.getFunctions());
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
                Micros / Frentes & Funções do MEVAM Kids
              </h1>
              <p className="text-xs text-slate-700">
                Estrutura 100% dinâmica e configurável pela Liderança — {visibleMicros.length} frente{visibleMicros.length !== 1 ? 's' : ''} cadastrada{visibleMicros.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {currentUser.role === 'ADMIN_LIDERANCA' && (
          <button
            onClick={handleOpenNewMicro}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ CRIAR NOVO MICRO</span>
          </button>
        )}
      </div>

      {/* Main Grid: Left = Micros List, Right = Micro Details, Functions & Custom Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Micros Selector Column */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Frentes Ativas (Micros)
          </div>
          {visibleMicros.map((m) => {
            const isSelected = selectedMicro?.id === m.id;
            const countVolunteers = storageService.getPeople().filter((p) => p.microIds.includes(m.id)).length;
            const countFns = functions.filter((f) => f.microId === m.id).length;
            const microShiftInfo = getMicroShiftInfo(m);

            return (
              <div
                key={m.id}
                onClick={() => handleSelectMicro(m)}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">{m.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${microShiftInfo.badgeClass}`}>
                        {microShiftInfo.badgeText}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {countVolunteers} voluntários • {countFns} funções
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditMicro(m);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 opacity-80 group-hover:opacity-100 transition-all"
                      title="Editar Frente e Período"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Micro Dashboard & Criteria */}
        {selectedMicro && (
          <div className="lg:col-span-8 space-y-6">
            {/* Top Micro Info Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-sm"
                    style={{ backgroundColor: selectedMicro.color }}
                  >
                    {selectedMicro.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <h2 className="text-lg font-extrabold text-slate-900 font-display">
                        {selectedMicro.name}
                      </h2>
                      {(() => {
                        const info = getMicroShiftInfo(selectedMicro);
                        return (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${info.badgeClass}`}>
                            {info.badgeText}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {selectedMicro.description || 'Frente ministerial oficial MEVAM Kids'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEditMicro(selectedMicro)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar Frente & Período</span>
                    </button>
                  )}
                  {currentUser.role === 'ADMIN_LIDERANCA' && micros.length > 1 && (
                    <button
                      onClick={() => handlePromptDeleteMicro(selectedMicro)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Período de Atuação da Frente Banner */}
              {(() => {
                const shiftInfo = getMicroShiftInfo(selectedMicro);
                const countFns = microFunctions.length;
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                            Período de Atuação desta Frente:
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded-full border text-xs ${shiftInfo.badgeClass}`}>
                            {shiftInfo.badgeText}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          {shiftInfo.label}
                        </p>
                      </div>

                      {canEdit && (
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMicro(selectedMicro)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-lg text-xs flex items-center space-x-1"
                          >
                            <Sun className="w-3 h-3 text-amber-600" />
                            <span>Alterar Período</span>
                          </button>
                          {countFns > 0 && (
                            <button
                              type="button"
                              onClick={() => handleReplicatePeriodToFunctions(selectedMicro)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg text-xs flex items-center space-x-1"
                              title="Replicar este período para todas as funções deste micro"
                            >
                              <Sliders className="w-3 h-3 text-indigo-600" />
                              <span>Sincronizar Funções ({countFns})</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Shift Toggles directly in the card */}
                    {canEdit && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center flex-wrap gap-1.5 text-[11px]">
                        <span className="text-slate-500 font-medium mr-1">Troca rápida:</span>
                        <button
                          type="button"
                          onClick={() => handleQuickChangeMicroPeriod(selectedMicro, ['NOITE'])}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            selectedMicro.defaultShifts?.length === 1 && selectedMicro.defaultShifts.includes('NOITE')
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          🌙 Só Noite
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickChangeMicroPeriod(selectedMicro, ['MANHA'])}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            selectedMicro.defaultShifts?.length === 1 && selectedMicro.defaultShifts.includes('MANHA')
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          ☀️ Só Manhã
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickChangeMicroPeriod(selectedMicro, ['MANHA', 'NOITE'])}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            selectedMicro.defaultShifts?.length === 2 && selectedMicro.defaultShifts.includes('MANHA') && selectedMicro.defaultShifts.includes('NOITE')
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          ☀️🌙 Manhã & Noite
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickChangeMicroPeriod(selectedMicro, ['ESPECIAL'], selectedMicro.specialEventNames || 'Culto de Casais, Culto de Mulheres')}
                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                            selectedMicro.defaultShifts?.length === 1 && selectedMicro.defaultShifts.includes('ESPECIAL')
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                          }`}
                        >
                          ⭐ Só Especiais
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isTeacherOrAux && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-blue-950 flex items-center space-x-1.5">
                      <GraduationCap className="w-4 h-4 text-blue-700" />
                      <span>Predefinições Rápidas de Turmas MEVAM Kids</span>
                    </div>
                    <p className="text-blue-900 mt-0.5 text-[11px]">
                      Gere automaticamente as funções das salas (ex: Dom Manhã 3-4, 5-6... Dom Noite 3-4, 5, 6... Cultos Especiais)
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPresetModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs text-xs shrink-0 self-start sm:self-center"
                  >
                    Ver / Aplicar Predefinições
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-700 block text-[11px]">Voluntários:</span>
                  <span className="text-base font-extrabold text-slate-900">{peopleInMicro.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-700 block text-[11px]">Funções:</span>
                  <span className="text-base font-extrabold text-slate-900">{microFunctions.length}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-700 block text-[11px]">Período da Frente:</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block truncate">
                    {getMicroShiftInfo(selectedMicro).badgeText}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-700 block text-[11px]">Status Operacional:</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    Ativo & Disponível
                  </span>
                </div>
              </div>
            </div>

            {/* Functions List Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Funções do Micro ({selectedMicro.name})</span>
                  </h3>
                  <p className="text-xs text-slate-700">
                    Defina os cargos, vagas padrão necessárias por culto e critérios de cada função.
                  </p>
                </div>

                {canEdit && (
                  <button
                    onClick={handleOpenNewFunction}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Função</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {microFunctions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-700 bg-slate-50 rounded-xl">
                    Nenhuma função cadastrada para este micro ainda. Clique em "Nova Função" para adicionar.
                  </div>
                ) : (
                  microFunctions.map((fn, fnIdx) => {
                    const shiftInfo = getFunctionShiftInfo(fn);

                    return (
                      <div
                        key={fn.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <FunctionIcon fn={fn} className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="font-bold text-slate-900 text-xs">{fn.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${shiftInfo.badgeClass}`}>
                              {shiftInfo.badgeText}
                            </span>
                            {fn.category && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                {fn.category}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-700 flex items-center space-x-3 flex-wrap">
                            <span>Vagas padrão por culto: <strong>{fn.defaultRequiredCount || 1}</strong></span>
                            {fn.criteria?.hasAgeGroupPreference && (
                              <span className="text-emerald-700 font-semibold">• Critério de Faixa Etária</span>
                            )}
                            <span className="text-indigo-700 font-medium">
                              • {shiftInfo.label}
                            </span>
                          </div>
                        </div>

                      {canEdit && (
                        <div className="flex items-center space-x-1">
                          <div className="flex flex-col mr-1">
                            <button
                              onClick={() => handleMoveFunction(fn.id, 'up')}
                              disabled={fnIdx === 0}
                              className="p-0.5 text-slate-400 hover:text-slate-900 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveFunction(fn.id, 'down')}
                              disabled={fnIdx === microFunctions.length - 1}
                              className="p-0.5 text-slate-400 hover:text-slate-900 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            onClick={() => handleOpenEditFunction(fn)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors"
                            title="Editar Função"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setFnToDelete(fn)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Excluir Função"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              </div>
            </div>

            {/* Custom Algorithm Weights Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>Critérios do Assistente de Escala ({selectedMicro.name})</span>
                  </h3>
                  <p className="text-xs text-slate-700">
                    Ajuste o peso de cada critério para este micro específico (0 = Ignorar, 100 = Peso Máximo).
                  </p>
                </div>

                {canEdit && (
                  <button
                    onClick={handleSaveWeights}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar Critérios</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Disponibilidade no Dia/Turno</span>
                    <span>{weights.availability}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.availability}
                    onChange={(e) => setWeights({ ...weights, availability: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Função Correta / Habilitação</span>
                    <span>{weights.correctFunction}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.correctFunction}
                    onChange={(e) => setWeights({ ...weights, correctFunction: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Equilíbrio de Frequência</span>
                    <span>{weights.frequencyBalance}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.frequencyBalance}
                    onChange={(e) => setWeights({ ...weights, frequencyBalance: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Recência (Dias sem Servir)</span>
                    <span>{weights.recency}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.recency}
                    onChange={(e) => setWeights({ ...weights, recency: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Rodízio de Parceiros</span>
                    <span>{weights.rotation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.rotation}
                    onChange={(e) => setWeights({ ...weights, rotation: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Vínculo Familiar (Escalar Juntos)</span>
                    <span>{weights.family}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.family}
                    onChange={(e) => setWeights({ ...weights, family: parseInt(e.target.value, 10) })}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: New / Edit Micro */}
      {isMicroModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingMicro ? 'Editar Frente (Micro) & Período' : 'Criar Nova Frente / Micro'}
              </h3>
              <span className="text-xs text-slate-500">MEVAM Kids</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NOME DO MICRO / FRENTE *</label>
                <input
                  type="text"
                  value={microName}
                  onChange={(e) => setMicroName(e.target.value)}
                  placeholder="Ex: Recepção, Louvor, 7 e 8 Anos, 3 a 6 Anos..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">COR DE IDENTIFICAÇÃO</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={microColor}
                      onChange={(e) => setMicroColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-slate-700">{microColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">STATUS</label>
                  <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs">
                    Ativo & Operacional
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">DESCRIÇÃO DA FRENTE</label>
                <textarea
                  value={microDesc}
                  onChange={(e) => setMicroDesc(e.target.value)}
                  rows={2}
                  placeholder="Finalidade e atuação desta frente..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* PERÍODO / TURNOS DE ATUAÇÃO DA FRENTE */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Período / Turnos de Atuação da Frente *
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Em quais cultos esta frente atua
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMicroAllowedShifts(['NOITE'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      microAllowedShifts.length === 1 && microAllowedShifts.includes('NOITE')
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    🌙 Só Noite
                  </button>
                  <button
                    type="button"
                    onClick={() => setMicroAllowedShifts(['MANHA'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      microAllowedShifts.length === 1 && microAllowedShifts.includes('MANHA')
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    ☀️ Só Manhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setMicroAllowedShifts(['MANHA', 'NOITE'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      microAllowedShifts.length === 2 && microAllowedShifts.includes('MANHA') && microAllowedShifts.includes('NOITE')
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    ☀️🌙 Manhã & Noite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMicroAllowedShifts(['ESPECIAL']);
                      if (!microSpecialEvents) setMicroSpecialEvents('Culto de Casais, Culto de Mulheres');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      microAllowedShifts.length === 1 && microAllowedShifts.includes('ESPECIAL')
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    ⭐ Só Cultos Especiais
                  </button>
                  <button
                    type="button"
                    onClick={() => setMicroAllowedShifts(['MANHA', 'NOITE', 'ESPECIAL'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      microAllowedShifts.length === 3
                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✨ Todos os Cultos
                  </button>
                </div>

                {/* Individual Checkboxes */}
                <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={microAllowedShifts.includes('MANHA')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...microAllowedShifts, 'MANHA']
                          : microAllowedShifts.filter((s) => s !== 'MANHA');
                        setMicroAllowedShifts(next.length > 0 ? next : ['MANHA']);
                      }}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span>☀️ Culto da Manhã</span>
                        <span className="text-[11px] font-normal text-slate-500">(Domingo 09h / 10h)</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Atua nos cultos matutinos regulares de domingo
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={microAllowedShifts.includes('NOITE')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...microAllowedShifts, 'NOITE']
                          : microAllowedShifts.filter((s) => s !== 'NOITE');
                        setMicroAllowedShifts(next.length > 0 ? next : ['NOITE']);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span>🌙 Culto da Noite</span>
                        <span className="text-[11px] font-normal text-slate-500">(Domingo 18h / 19h)</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Atua no culto principal da noite de domingo (ex: Louvor, Recepção, salas da noite)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={microAllowedShifts.includes('ESPECIAL')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...microAllowedShifts, 'ESPECIAL']
                          : microAllowedShifts.filter((s) => s !== 'ESPECIAL');
                        setMicroAllowedShifts(next.length > 0 ? next : ['NOITE']);
                      }}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span>⭐ Cultos Especiais</span>
                        <span className="text-[11px] font-normal text-slate-500">(Eventos extraordinários)</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Atua em cultos temáticos (ex: Culto de Casais, Culto de Mulheres, Conferências)
                      </p>
                    </div>
                  </label>
                </div>

                {/* Conditional Special Events Description */}
                {microAllowedShifts.includes('ESPECIAL') && (
                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 space-y-1">
                    <label className="block font-bold text-purple-900 text-xs">
                      Quais Cultos Especiais esta Frente Atende?
                    </label>
                    <input
                      type="text"
                      value={microSpecialEvents}
                      onChange={(e) => setMicroSpecialEvents(e.target.value)}
                      placeholder="Ex: Culto de Casais, Culto de Mulheres, Santa Ceia, Vigília..."
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-purple-700 block">
                      Especificar os tipos de eventos facilita o filtro automático ao criar escalas temáticas.
                    </span>
                  </div>
                )}

                {/* Option to apply to all functions of this micro */}
                {editingMicro && functions.filter((f) => f.microId === editingMicro.id).length > 0 && (
                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={microApplyToFunctions}
                        onChange={(e) => setMicroApplyToFunctions(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 mt-0.5 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-bold text-blue-950 text-xs flex items-center space-x-1">
                          <span>🔄 Aplicar este período a todas as funções deste micro</span>
                          <span className="bg-blue-200 text-blue-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                            {functions.filter((f) => f.microId === editingMicro.id).length} funções
                          </span>
                        </span>
                        <p className="text-[11px] text-blue-800 mt-0.5">
                          Atualiza instantaneamente os turnos permitidos de todas as funções cadastradas nesta frente para coincidirem com este período.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsMicroModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMicro}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Salvar Frente & Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Function */}
      {isFnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 font-display">
              {editingFn ? 'Editar Função' : `Nova Função em ${selectedMicro?.name}`}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">NOME DA FUNÇÃO *</label>
                <input
                  type="text"
                  value={fnName}
                  onChange={(e) => setFnName(e.target.value)}
                  placeholder="Ex: Bateria, Som, Professor 9 e 10 anos..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CATEGORIA / SEÇÃO (OPCIONAL)</label>
                <input
                  type="text"
                  value={fnCategory}
                  onChange={(e) => setFnCategory(e.target.value)}
                  placeholder="Ex: Sala 3 a 6 anos, Vocais, Instrumentos..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">VAGAS PADRÃO POR CULTO</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={fnCount}
                  onChange={(e) => setFnCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {isLouvorMicro && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TIPO (CONFLITO DE HORÁRIO)</label>
                  <select
                    value={fnConflictGroup}
                    onChange={(e) => setFnConflictGroup(e.target.value as FunctionConflictGroup | '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">Não classificado</option>
                    <option value="VOZ">🎤 Voz (vocal)</option>
                    <option value="INSTRUMENTO">🎸 Instrumento</option>
                    <option value="TECNICA">🎚️ Técnica (mesa de som, etc.)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Define quando um voluntário pode acumular esta função com outra do Louvor no mesmo culto: Voz + Instrumento é permitido, mas dois Instrumentos/Técnica ao mesmo tempo não.
                  </p>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fnAllowsGuestEntry}
                    onChange={(e) => setFnAllowsGuestEntry(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 mt-0.5 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs">
                      Não precisa de cadastro (ex: Participação Especial)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Na escala, essa vaga aceita um nome digitado na hora, sem precisar ser um voluntário cadastrado — e o Assistente Inteligente nunca tenta preenchê-la sozinho.
                    </p>
                  </div>
                </label>
              </div>

              {/* Turnos / Cultos de Atuação */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Turnos e Cultos de Atuação *
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Escolha em quais cultos esta função existe
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFnAllowedShifts(['NOITE'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      fnAllowedShifts.length === 1 && fnAllowedShifts.includes('NOITE')
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    🌙 Só Noite
                  </button>
                  <button
                    type="button"
                    onClick={() => setFnAllowedShifts(['MANHA'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      fnAllowedShifts.length === 1 && fnAllowedShifts.includes('MANHA')
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    ☀️ Só Manhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setFnAllowedShifts(['MANHA', 'NOITE'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      fnAllowedShifts.length === 2 && fnAllowedShifts.includes('MANHA') && fnAllowedShifts.includes('NOITE')
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    ☀️🌙 Manhã & Noite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFnAllowedShifts(['ESPECIAL']);
                      if (!fnSpecialEvents) setFnSpecialEvents('Culto de Casais, Culto de Mulheres');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      fnAllowedShifts.length === 1 && fnAllowedShifts.includes('ESPECIAL')
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    ⭐ Só Cultos Especiais
                  </button>
                  <button
                    type="button"
                    onClick={() => setFnAllowedShifts(['MANHA', 'NOITE', 'ESPECIAL'])}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      fnAllowedShifts.length === 3
                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ✨ Todos os Cultos
                  </button>
                </div>

                {/* Individual Checkboxes */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fnAllowedShifts.includes('MANHA')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...fnAllowedShifts, 'MANHA']
                          : fnAllowedShifts.filter((s) => s !== 'MANHA');
                        setFnAllowedShifts(next.length > 0 ? next : ['MANHA']);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">☀️ Culto da Manhã</span>
                      <span className="text-slate-500 ml-1.5">(Domingo 09h / 10h)</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fnAllowedShifts.includes('NOITE')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...fnAllowedShifts, 'NOITE']
                          : fnAllowedShifts.filter((s) => s !== 'NOITE');
                        setFnAllowedShifts(next.length > 0 ? next : ['NOITE']);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">🌙 Culto da Noite</span>
                      <span className="text-slate-500 ml-1.5">(Domingo 18h / 19h - ex: Louvor)</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fnAllowedShifts.includes('ESPECIAL')}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...fnAllowedShifts, 'ESPECIAL']
                          : fnAllowedShifts.filter((s) => s !== 'ESPECIAL');
                        setFnAllowedShifts(next.length > 0 ? next : ['ESPECIAL']);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">⭐ Cultos Especiais</span>
                      <span className="text-slate-500 ml-1.5">(Culto de Casais, Mulheres, Conferências...)</span>
                    </div>
                  </label>

                  {/* Special event names input */}
                  {fnAllowedShifts.includes('ESPECIAL') && (
                    <div className="pt-2 pl-6">
                      <label className="block text-[11px] font-bold text-purple-900 mb-1">
                        Quais cultos especiais? (Ex: Culto de Casais, Culto de Mulheres...)
                      </label>
                      <input
                        type="text"
                        value={fnSpecialEvents}
                        onChange={(e) => setFnSpecialEvents(e.target.value)}
                        placeholder="Ex: Culto de Casais, Culto de Mulheres..."
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAgePref}
                    onChange={(e) => setHasAgePref(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Habilitar critério de Faixa Etária (ex: Professores)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsFnModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFunction}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Salvar Função
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Micro Confirmation */}
      {isDeleteMicroModalOpen && microToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Excluir Frente / Micro
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir permanentemente o micro <strong className="text-slate-900">{microToDelete.name}</strong>?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <div className="font-bold">⚠️ Consequências da exclusão:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                <li>Todas as funções deste micro serão removidas.</li>
                <li>Os voluntários perderão o vínculo com este micro e suas preferências.</li>
                <li>Vagas abertas ou atribuídas deste micro em escalas futuras serão canceladas.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteMicroModalOpen(false);
                  setMicroToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteMicro}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Classroom Presets */}
      {isPresetModalOpen && selectedMicro && (
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
                  Selecione um modelo para adicionar instantaneamente as funções de turmas para {selectedMicro.name}:
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
                      onClick={() => handleApplyPresetToSelectedMicro(preset.key)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-2xs"
                    >
                      + Adicionar Funções
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
                onClick={() => setIsPresetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Function */}
      {fnToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Excluir Função
                </h3>
                <p className="text-xs text-slate-600">
                  Deseja excluir a função "{fnToDelete.name}"?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Esta função será desvinculada de voluntários e escalas futuras.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setFnToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteFunction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
