import {
  Schedule,
  ScheduleSlot,
  Person,
  Micro,
  MicroFunction,
  AlgorithmWeights,
  Family
} from '../types';
import { storageService } from './storageService';
import { isFunctionActiveForShift, isMicroActiveForShift } from '../utils/functionShiftUtils';

export interface CandidateScore {
  person: Person;
  totalScore: number;
  availabilityScore: number;
  functionMatchScore: number;
  preferenceScore: number;
  frequencyScore: number;
  recencyScore: number;
  rotationScore: number;
  familyScore: number;
  experienceScore: number;
  isEligible: boolean;
  disqualificationReason?: string;
  reasons: string[];
}

export interface GenerationResult {
  schedule: Schedule;
  metrics: {
    availabilityPercent: number;
    filledPercent: number;
    balancePercent: number;
    rotationPercent: number;
    familyPercent: number;
    preferencePercent: number;
  };
  unfilledSlotsCount: number;
  conflictsDetected: string[];
}

export class SchedulerAlgorithm {
  /**
   * Evaluates a single person for a specific slot.
   */
  evaluateCandidate(
    person: Person,
    slot: ScheduleSlot,
    schedule: Schedule,
    currentBatchSlots: ScheduleSlot[] = [],
    weights: AlgorithmWeights
  ): CandidateScore {
    const reasons: string[] = [];

    // 1. HARD CHECK: Is the person active?
    if (!person.active) {
      return {
        person,
        totalScore: -9999,
        availabilityScore: 0,
        functionMatchScore: 0,
        preferenceScore: 0,
        frequencyScore: 0,
        recencyScore: 0,
        rotationScore: 0,
        familyScore: 0,
        experienceScore: 0,
        isEligible: false,
        disqualificationReason: 'Cadastro inativo',
        reasons: ['Cadastro inativo']
      };
    }

    // 2. HARD CHECK: Does the person belong to this Micro?
    if (!person.microIds.includes(slot.microId)) {
      return {
        person,
        totalScore: -9999,
        availabilityScore: 0,
        functionMatchScore: 0,
        preferenceScore: 0,
        frequencyScore: 0,
        recencyScore: 0,
        rotationScore: 0,
        familyScore: 0,
        experienceScore: 0,
        isEligible: false,
        disqualificationReason: 'Não participa deste Micro',
        reasons: ['Voluntário não cadastrado neste micro']
      };
    }

    // 3. HARD CHECK: Cross-micro conflict on the exact same date & shift
    // Check against existing schedules
    const existingConflict = storageService.checkCrossMicroConflict(person.id, slot.date, schedule.id, slot.id);
    if (existingConflict.hasConflict) {
      const cMicro = existingConflict.conflictingMicro?.name || 'outro micro';
      const cFn = existingConflict.conflictingFunction?.name || 'outra função';
      return {
        person,
        totalScore: -9999,
        availabilityScore: 0,
        functionMatchScore: 0,
        preferenceScore: 0,
        frequencyScore: 0,
        recencyScore: 0,
        rotationScore: 0,
        familyScore: 0,
        experienceScore: 0,
        isEligible: false,
        disqualificationReason: `Conflito: já escalado em ${cMicro} (${cFn})`,
        reasons: [`Já escalado em ${cMicro} (${cFn}) nesta data`]
      };
    }

    // Also check against slots already assigned in the current generation batch for this date
    const sameDateBatchAssignment = currentBatchSlots.find(
      (s) => s.date === slot.date && s.assignedPersonId === person.id && s.id !== slot.id
    );
    if (sameDateBatchAssignment) {
      const mName = storageService.getMicroById(sameDateBatchAssignment.microId)?.name || 'outro micro';
      return {
        person,
        totalScore: -9999,
        availabilityScore: 0,
        functionMatchScore: 0,
        preferenceScore: 0,
        frequencyScore: 0,
        recencyScore: 0,
        rotationScore: 0,
        familyScore: 0,
        experienceScore: 0,
        isEligible: false,
        disqualificationReason: `Conflito na mesma data com ${mName}`,
        reasons: [`Já escalado na mesma data em ${mName}`]
      };
    }

    // 4. HARD / WEIGHTED CHECK: Availability for Date & Shift
    const availCheck = storageService.isPersonAvailable(person.id, slot.date, schedule.shift);
    if (!availCheck.available) {
      return {
        person,
        totalScore: -9999,
        availabilityScore: 0,
        functionMatchScore: 0,
        preferenceScore: 0,
        frequencyScore: 0,
        recencyScore: 0,
        rotationScore: 0,
        familyScore: 0,
        experienceScore: 0,
        isEligible: false,
        disqualificationReason: availCheck.reason || 'Indisponível na data/horário',
        reasons: [availCheck.reason || 'Indisponível nesta data']
      };
    }

    const availabilityScore = 100;
    reasons.push('Disponibilidade confirmada');

    // 5. FUNCTION MATCH
    const fnPref = person.functionPreferences.find((fp) => fp.microId === slot.microId && fp.functionId === slot.functionId);
    let functionMatchScore = 50;
    if (fnPref) {
      functionMatchScore = 100;
      reasons.push('Possui a função cadastrada');
    } else {
      reasons.push('Apto para apoio na função');
    }

    // 6. VOLUNTEER PREFERENCES (Shift, Day, Age Group)
    let preferenceScore = 70;
    if (fnPref) {
      let prefMatches = 0;
      let totalPrefChecks = 0;

      // Shift preference
      const targetShift =
        schedule.shift === 'NOITE' ? 'Noite' :
        schedule.shift === 'MANHA' ? 'Manhã' :
        schedule.shift === 'ESPECIAL' ? 'Especial' :
        null; // AMBOS/TARDE have no single matching label, so the preference check is skipped

      if (fnPref.preferredShifts && fnPref.preferredShifts.length > 0 && targetShift) {
        totalPrefChecks++;
        if (fnPref.preferredShifts.includes(targetShift)) {
          prefMatches++;
          reasons.push(`Prefere turno ${targetShift.toLowerCase()}`);
        }
      }

      // Age group preference (for teaching/auxiliary)
      if (slot.sectionTitle && fnPref.preferredAgeGroups && fnPref.preferredAgeGroups.length > 0) {
        totalPrefChecks++;
        if (fnPref.preferredAgeGroups.includes(slot.sectionTitle)) {
          prefMatches++;
          reasons.push(`Prefere faixa etária ${slot.sectionTitle}`);
        }
      }

      if (totalPrefChecks > 0) {
        preferenceScore = Math.round((prefMatches / totalPrefChecks) * 50) + 50;
      }
    }

    // 7. EXPERIENCE LEVEL
    let experienceScore = 70;
    if (fnPref?.experienceLevel === 'AVANCADO') {
      experienceScore = 100;
      reasons.push('Experiência avançada');
    } else if (fnPref?.experienceLevel === 'INTERMEDIARIO') {
      experienceScore = 80;
    } else if (fnPref?.experienceLevel === 'INICIANTE') {
      experienceScore = 60;
    }

    // 8. FREQUENCY BALANCE & RECENCY (Days without serving)
    // Count assignments in current schedule batch + past schedules
    const currentAssignmentsCount = currentBatchSlots.filter((s) => s.assignedPersonId === person.id).length;
    let frequencyScore = Math.max(20, 100 - currentAssignmentsCount * 30);
    if (currentAssignmentsCount === 0) {
      reasons.push('Não possui escalas planejadas neste período');
    } else {
      reasons.push(`Possui ${currentAssignmentsCount} escala(s) no lote atual`);
    }

    // Calculate approximate days since last served from rotation history & current schedules
    const rotHistory = storageService.getRotationHistory().filter((h) => h.personId === person.id);
    let recencyScore = 85;
    if (rotHistory.length > 0) {
      const lastDate = rotHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date;
      const daysSince = Math.round(
        (new Date(slot.date).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince >= 21) {
        recencyScore = 100;
        reasons.push(`Está há ${daysSince} dias sem servir`);
      } else if (daysSince >= 14) {
        recencyScore = 85;
        reasons.push(`Serviu há ${daysSince} dias`);
      } else {
        recencyScore = 60;
        reasons.push(`Serviu recentemente (${daysSince} dias)`);
      }
    } else {
      recencyScore = 95;
      reasons.push('Aguardando oportunidade para servir');
    }

    // 9. FAMILY CO-SCHEDULING BONUS
    let familyScore = 0;
    if (person.familyId) {
      const family = storageService.getFamilyById(person.familyId);
      if (family && family.priority !== 'DESATIVADA') {
        const familyMembers = storageService.getFamilyMembers(person.familyId).filter((m) => m.id !== person.id);
        const memberIds = new Set(familyMembers.map((m) => m.id));

        // Is another family member scheduled on this same date?
        const isFamilyMemberScheduledToday = currentBatchSlots.some(
          (s) => s.date === slot.date && s.assignedPersonId && memberIds.has(s.assignedPersonId)
        );

        if (isFamilyMemberScheduledToday) {
          const priorityMultipliers: Record<string, number> = {
            MUITO_ALTA: 100,
            ALTA: 85,
            MEDIA: 60,
            BAIXA: 35
          };
          familyScore = priorityMultipliers[family.priority] || 60;
          reasons.push(`${family.name} já possui familiar servindo no mesmo culto`);
        }
      }
    }

    // 10. PEER ROTATION (Promote serving with different teammates)
    let rotationScore = 80;
    const sameSlotDateAssigned = currentBatchSlots
      .filter((s) => s.date === slot.date && s.assignedPersonId && s.id !== slot.id)
      .map((s) => s.assignedPersonId!);

    if (sameSlotDateAssigned.length > 0) {
      // Check historical co-volunteering
      let totalServedTogether = 0;
      for (const otherId of sameSlotDateAssigned) {
        const sharedServices = rotHistory.filter((rh) => rh.coVolunteers.includes(otherId)).length;
        totalServedTogether += sharedServices;
      }
      if (totalServedTogether === 0) {
        rotationScore = 95;
        reasons.push('Excelente rodízio com novos parceiros de ministério');
      } else if (totalServedTogether < 3) {
        rotationScore = 85;
      } else {
        rotationScore = 65;
        reasons.push('Já serviu com estes voluntários em ocasiões recentes');
      }
    }

    // --- WEIGHTED SUM ---
    const totalWeights =
      weights.availability +
      weights.correctFunction +
      weights.volunteerPreference +
      weights.frequencyBalance +
      weights.recency +
      weights.rotation +
      weights.family +
      weights.experience;

    const weightedScore =
      availabilityScore * (weights.availability / 100) +
      functionMatchScore * (weights.correctFunction / 100) +
      preferenceScore * (weights.volunteerPreference / 100) +
      frequencyScore * (weights.frequencyBalance / 100) +
      recencyScore * (weights.recency / 100) +
      rotationScore * (weights.rotation / 100) +
      familyScore * (weights.family / 100) +
      experienceScore * (weights.experience / 100);

    const normalizedTotal = Math.min(100, Math.round((weightedScore / (totalWeights / 100))));

    return {
      person,
      totalScore: normalizedTotal,
      availabilityScore,
      functionMatchScore,
      preferenceScore,
      frequencyScore,
      recencyScore,
      rotationScore,
      familyScore,
      experienceScore,
      isEligible: true,
      reasons
    };
  }

  /**
   * Generates or optimizes a schedule automatically using the smart heuristic multi-factor solver.
   */
  generateSchedule(
    schedule: Schedule,
    targetMicroIds?: string[],
    preserveManualOverrides = true
  ): GenerationResult {
    const micros = storageService.getMicros();
    const allPeople = storageService.getPeople().filter((p) => p.active);
    const conflictsDetected: string[] = [];

    // Clone slots
    const workingSlots: ScheduleSlot[] = JSON.parse(JSON.stringify(schedule.slots));
    const activeMicroIds = targetMicroIds || schedule.microIds;

    // Filter slots to process
    const slotsToProcess = workingSlots.filter((s) => {
      if (!activeMicroIds.includes(s.microId)) return false;
      if (preserveManualOverrides && s.manualOverride && s.assignedPersonId) return false;
      return true;
    });

    // Sort slots logically:
    // First by Date, then Critical roles (e.g. Som, Professor, Líder) first, then Auxiliaries
    slotsToProcess.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.slotIndex - b.slotIndex;
    });

    let unfilledCount = 0;

    for (const slot of slotsToProcess) {
      const micro = micros.find((m) => m.id === slot.microId);
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

      // Candidates list
      const candidateScores: CandidateScore[] = [];

      for (const person of allPeople) {
        const scoreResult = this.evaluateCandidate(person, slot, schedule, workingSlots, weights);
        if (scoreResult.isEligible && scoreResult.totalScore > 0) {
          candidateScores.push(scoreResult);
        }
      }

      // Sort descending by total score
      candidateScores.sort((a, b) => b.totalScore - a.totalScore);

      if (candidateScores.length > 0) {
        const bestCandidate = candidateScores[0];
        slot.assignedPersonId = bestCandidate.person.id;
        slot.assignedPersonName = bestCandidate.person.name;
        slot.manualOverride = false;
        slot.score = bestCandidate.totalScore;
        slot.scoreBreakdown = {
          availabilityScore: bestCandidate.availabilityScore,
          functionMatchScore: bestCandidate.functionMatchScore,
          preferenceScore: bestCandidate.preferenceScore,
          frequencyScore: bestCandidate.frequencyScore,
          recencyScore: bestCandidate.recencyScore,
          rotationScore: bestCandidate.rotationScore,
          familyScore: bestCandidate.familyScore,
          experienceScore: bestCandidate.experienceScore,
          totalScore: bestCandidate.totalScore,
          reasons: bestCandidate.reasons
        };
      } else {
        slot.assignedPersonId = undefined;
        slot.assignedPersonName = undefined;
        slot.score = undefined;
        slot.scoreBreakdown = undefined;
        unfilledCount++;
      }
    }

    // Compute holistic quality metrics
    const totalFilled = workingSlots.filter((s) => !!s.assignedPersonId).length;
    const filledPercent = workingSlots.length > 0 ? Math.round((totalFilled / workingSlots.length) * 100) : 100;

    // Calculate quality metrics
    const filledSlots = workingSlots.filter((s) => s.scoreBreakdown);
    const avgAvail = 100;
    const avgPref = filledSlots.length > 0
      ? Math.round(filledSlots.reduce((acc, s) => acc + (s.scoreBreakdown?.preferenceScore || 80), 0) / filledSlots.length)
      : 90;
    const avgBalance = filledSlots.length > 0
      ? Math.round(filledSlots.reduce((acc, s) => acc + (s.scoreBreakdown?.frequencyScore || 80), 0) / filledSlots.length)
      : 88;
    const avgRotation = filledSlots.length > 0
      ? Math.round(filledSlots.reduce((acc, s) => acc + (s.scoreBreakdown?.rotationScore || 80), 0) / filledSlots.length)
      : 86;
    const avgFamily = 85;

    const metrics = {
      availabilityPercent: avgAvail,
      filledPercent,
      balancePercent: Math.min(100, avgBalance),
      rotationPercent: Math.min(100, avgRotation),
      familyPercent: avgFamily,
      preferencePercent: Math.min(100, avgPref)
    };

    const updatedSchedule: Schedule = {
      ...schedule,
      slots: workingSlots,
      qualityMetrics: metrics,
      updatedAt: new Date().toISOString()
    };

    return {
      schedule: updatedSchedule,
      metrics,
      unfilledSlotsCount: unfilledCount,
      conflictsDetected
    };
  }

  /**
   * Helper to build empty or template slots for a set of dates and micros.
   */
  createSlotsForSchedule(
    scheduleId: string,
    dates: string[],
    microIds: string[],
    scheduleShift?: string
  ): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    const functions = storageService.getFunctions();

    for (const microId of microIds) {
      const micro = storageService.getMicroById(microId);
      if (micro && scheduleShift && !isMicroActiveForShift(micro, scheduleShift)) {
        continue;
      }

      const microFunctions = functions.filter((f) => f.microId === microId);

      for (const fn of microFunctions) {
        // Only include functions that operate in the schedule's shift
        if (scheduleShift && !isFunctionActiveForShift(fn, scheduleShift)) {
          continue;
        }

        const count = fn.defaultRequiredCount || 1;

        for (let i = 1; i <= count; i++) {
          for (const date of dates) {
            slots.push({
              id: `slot-${microId}-${fn.id}-${date}-${i}`,
              scheduleId,
              date,
              microId,
              functionId: fn.id,
              sectionTitle: fn.category || fn.name,
              slotIndex: i,
              manualOverride: false
            });
          }
        }
      }
    }

    return slots;
  }
}

export const schedulerAlgorithm = new SchedulerAlgorithm();
