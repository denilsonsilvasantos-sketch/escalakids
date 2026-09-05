import { Micro, MicroFunction } from '../types';

export type ShiftType = 'MANHA' | 'NOITE' | 'ESPECIAL';

export const ALL_SHIFTS: { id: ShiftType; label: string; timeHint: string; icon: string }[] = [
  { id: 'MANHA', label: 'Culto da Manhã', timeHint: 'Domingo 09h / 10h', icon: '☀️' },
  { id: 'NOITE', label: 'Culto da Noite', timeHint: 'Domingo 18h / 19h', icon: '🌙' },
  { id: 'ESPECIAL', label: 'Cultos Especiais', timeHint: 'Casais, Mulheres, Conferências...', icon: '⭐' }
];

export function normalizeShift(val: string | undefined): ShiftType | null {
  if (!val) return null;
  const s = val.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('MANHA')) return 'MANHA';
  if (s.includes('NOITE')) return 'NOITE';
  if (s.includes('ESPECIAL') || s.includes('CASAI') || s.includes('MULHER')) return 'ESPECIAL';
  return null;
}

export interface FunctionShiftBadgeInfo {
  shifts: ShiftType[];
  label: string;
  badgeText: string;
  badgeClass: string;
  specialEventNames?: string;
  isNightOnly: boolean;
  isMorningOnly: boolean;
  isSpecialOnly: boolean;
  isAllShifts: boolean;
}

export function getFunctionShiftInfo(fn: MicroFunction): FunctionShiftBadgeInfo {
  const allowed = fn.criteria?.allowedShifts || [];
  const normalizedShifts: ShiftType[] = [];

  for (const s of allowed) {
    const norm = normalizeShift(s);
    if (norm && !normalizedShifts.includes(norm)) {
      normalizedShifts.push(norm);
    }
  }

  const specialEventNames = fn.criteria?.specialEventNames?.trim();

  // If no specific shifts defined, it operates in all shifts
  if (normalizedShifts.length === 0) {
    return {
      shifts: ['MANHA', 'NOITE', 'ESPECIAL'],
      label: 'Todos os Turnos / Cultos',
      badgeText: '✨ Todos os Cultos',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: false,
      isSpecialOnly: false,
      isAllShifts: true
    };
  }

  const hasManha = normalizedShifts.includes('MANHA');
  const hasNoite = normalizedShifts.includes('NOITE');
  const hasEspecial = normalizedShifts.includes('ESPECIAL');

  if (hasNoite && !hasManha && !hasEspecial) {
    return {
      shifts: ['NOITE'],
      label: 'Só Culto a Noite (18h/19h)',
      badgeText: '🌙 Só Culto Noite',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      specialEventNames,
      isNightOnly: true,
      isMorningOnly: false,
      isSpecialOnly: false,
      isAllShifts: false
    };
  }

  if (hasManha && !hasNoite && !hasEspecial) {
    return {
      shifts: ['MANHA'],
      label: 'Só Culto da Manhã (09h/10h)',
      badgeText: '☀️ Só Culto Manhã',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: true,
      isSpecialOnly: false,
      isAllShifts: false
    };
  }

  if (hasEspecial && !hasManha && !hasNoite) {
    const text = specialEventNames ? `⭐ Cultos Especiais (${specialEventNames})` : '⭐ Só Cultos Especiais';
    return {
      shifts: ['ESPECIAL'],
      label: specialEventNames ? `Cultos Especiais (${specialEventNames})` : 'Só Cultos Especiais',
      badgeText: text,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: false,
      isSpecialOnly: true,
      isAllShifts: false
    };
  }

  if (hasManha && hasNoite && !hasEspecial) {
    return {
      shifts: ['MANHA', 'NOITE'],
      label: 'Culto da Manhã & Noite',
      badgeText: '☀️🌙 Manhã & Noite',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: false,
      isSpecialOnly: false,
      isAllShifts: false
    };
  }

  // Combined (e.g. Manhã, Noite + Especiais or Noite + Especial)
  const parts: string[] = [];
  if (hasManha) parts.push('Manhã');
  if (hasNoite) parts.push('Noite');
  if (hasEspecial) parts.push(specialEventNames || 'Especiais');

  return {
    shifts: normalizedShifts,
    label: parts.join(' + '),
    badgeText: `✨ ${parts.join(' + ')}`,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    specialEventNames,
    isNightOnly: false,
    isMorningOnly: false,
    isSpecialOnly: false,
    isAllShifts: normalizedShifts.length >= 3
  };
}

export function isFunctionActiveForShift(fn: MicroFunction, scheduleShift?: string): boolean {
  if (!scheduleShift) return true;
  const normSched = normalizeShift(scheduleShift);
  if (!normSched) return true; // e.g. "AMBOS" or "TODOS"

  const info = getFunctionShiftInfo(fn);
  if (info.isAllShifts) return true;

  return info.shifts.includes(normSched);
}

export interface MicroShiftBadgeInfo {
  shifts: ShiftType[];
  label: string;
  badgeText: string;
  badgeClass: string;
  specialEventNames?: string;
  isNightOnly: boolean;
  isMorningOnly: boolean;
  isSpecialOnly: boolean;
  isAllShifts: boolean;
}

export function getMicroShiftInfo(micro: Micro): MicroShiftBadgeInfo {
  const allowed = micro.defaultShifts || [];
  const normalizedShifts: ShiftType[] = [];

  for (const s of allowed) {
    const norm = normalizeShift(s);
    if (norm && !normalizedShifts.includes(norm)) {
      normalizedShifts.push(norm);
    }
  }

  const specialEventNames = micro.specialEventNames?.trim();

  // If no specific shifts defined, it defaults to all shifts
  if (normalizedShifts.length === 0) {
    return {
      shifts: ['MANHA', 'NOITE', 'ESPECIAL'],
      label: 'Todos os Períodos / Cultos',
      badgeText: '✨ Todos os Turnos',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: false,
      isSpecialOnly: false,
      isAllShifts: true
    };
  }

  const hasManha = normalizedShifts.includes('MANHA');
  const hasNoite = normalizedShifts.includes('NOITE');
  const hasEspecial = normalizedShifts.includes('ESPECIAL');

  if (hasNoite && !hasManha && !hasEspecial) {
    return {
      shifts: ['NOITE'],
      label: 'Só Culto da Noite (18h/19h)',
      badgeText: '🌙 Só Noite',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      specialEventNames,
      isNightOnly: true,
      isMorningOnly: false,
      isSpecialOnly: false,
      isAllShifts: false
    };
  }

  if (hasManha && !hasNoite && !hasEspecial) {
    return {
      shifts: ['MANHA'],
      label: 'Só Culto da Manhã (09h/10h)',
      badgeText: '☀️ Só Manhã',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: true,
      isSpecialOnly: false,
      isAllShifts: false
    };
  }

  if (hasEspecial && !hasManha && !hasNoite) {
    const text = specialEventNames ? `⭐ Especiais (${specialEventNames})` : '⭐ Só Especiais';
    return {
      shifts: ['ESPECIAL'],
      label: specialEventNames ? `Cultos Especiais (${specialEventNames})` : 'Só Cultos Especiais',
      badgeText: text,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: false,
      isSpecialOnly: true,
      isAllShifts: false
    };
  }

  if (hasManha && hasNoite && !hasEspecial) {
    return {
      shifts: ['MANHA', 'NOITE'],
      label: 'Manhã & Noite',
      badgeText: '☀️🌙 Manhã & Noite',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      specialEventNames,
      isNightOnly: false,
      isMorningOnly: false,
      isSpecialOnly: false,
      isAllShifts: false
    };
  }

  // Combined
  const parts: string[] = [];
  if (hasManha) parts.push('Manhã');
  if (hasNoite) parts.push('Noite');
  if (hasEspecial) parts.push(specialEventNames || 'Especiais');

  return {
    shifts: normalizedShifts,
    label: parts.join(' + '),
    badgeText: `✨ ${parts.join(' + ')}`,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    specialEventNames,
    isNightOnly: false,
    isMorningOnly: false,
    isSpecialOnly: false,
    isAllShifts: normalizedShifts.length >= 3
  };
}

export function isMicroActiveForShift(micro: Micro, scheduleShift?: string): boolean {
  if (!scheduleShift) return true;
  const normSched = normalizeShift(scheduleShift);
  if (!normSched) return true;

  const info = getMicroShiftInfo(micro);
  if (info.isAllShifts) return true;

  return info.shifts.includes(normSched);
}
