import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { Schedule, ScheduleSlot, Micro, MicroFunction, Person, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { schedulerAlgorithm, CandidateScore } from '../../services/schedulerAlgorithm';
import { exportService } from '../../services/exportService';

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

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(schedules[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeSlot, setActiveSlot] = useState<ScheduleSlot | null>(null);
  const [activeSlotCandidates, setActiveSlotCandidates] = useState<CandidateScore[]>([]);

  const currentSchedule = schedules.find((s) => s.id === selectedScheduleId) || schedules[0];
  const currentMicro = allMicros.find((m) => m.id === selectedMicroId) || accessibleMicros[0];
  const microFunctions = allFunctions.filter((f) => f.microId === currentMicro?.id);

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

  const formatDateLabel = (d: string) => {
    const parts = d.split('-');
    if (parts.length === 3) {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]}/${months[mIdx] || parts[1]}`;
    }
    return d;
  };

  if (!currentSchedule || !currentMicro) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-700">
        Nenhum micro ou escala disponível para exibição.
      </div>
    );
  }

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
                {currentSchedule.title} • {currentSchedule.eventName}
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
          </div>
        </div>
      </div>

      {/* Grid of functions for this micro */}
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

                        const isAssigned = !!slot.assignedPersonId;

                        return (
                          <td key={date} className="p-2 border-r border-slate-100">
                            {isAssigned ? (
                              <div
                                onClick={() => handleOpenSlotPicker(slot)}
                                className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between shadow-2xs ${
                                  slot.manualOverride
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                                }`}
                              >
                                <span className="truncate">{slot.assignedPersonName}</span>
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
    </div>
  );
};
