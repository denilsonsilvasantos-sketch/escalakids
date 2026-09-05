import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  AlgorithmWeights,
  Family,
  Micro,
  MicroFunction,
  Person,
  RotationHistoryItem,
  Schedule,
  ScheduleSlot
} from '../types';

// schedulerAlgorithm reads all shared state (people, micros, families, rotation
// history, availability, cross-micro conflicts) through the storageService
// singleton. Mocking it lets these tests exercise the scoring/assignment logic
// in isolation, with fully controlled fixtures, instead of needing a real
// localStorage/server environment.
const mockStorageService = {
  checkSameMicroConflict: vi.fn(),
  isPersonAvailable: vi.fn(),
  getRotationHistory: vi.fn(),
  getFamilyById: vi.fn(),
  getFamilyMembers: vi.fn(),
  getMicros: vi.fn(),
  getPeople: vi.fn(),
  getMicroById: vi.fn(),
  getFunctions: vi.fn(),
  getFunctionById: vi.fn()
};

vi.mock('./storageService', () => ({
  storageService: mockStorageService
}));

// Imported after the mock is registered so schedulerAlgorithm picks up the fake.
const { schedulerAlgorithm } = await import('./schedulerAlgorithm');

const DEFAULT_WEIGHTS: AlgorithmWeights = {
  availability: 100,
  correctFunction: 100,
  volunteerPreference: 80,
  frequencyBalance: 90,
  recency: 80,
  rotation: 80,
  family: 60,
  experience: 50
};

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: 'p-1',
    name: 'Maria Silva',
    birthDate: '1990-01-01',
    phone: '47999990000',
    whatsapp: '47999990000',
    active: true,
    microIds: ['micro-louvor'],
    functionPreferences: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 'slot-1',
    scheduleId: 'sched-1',
    date: '2026-09-06',
    microId: 'micro-louvor',
    functionId: 'fn-vocal',
    slotIndex: 1,
    manualOverride: false,
    ...overrides
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    title: 'Escala Teste',
    eventName: 'Culto de Domingo',
    shift: 'NOITE',
    dates: ['2026-09-06'],
    microIds: ['micro-louvor'],
    status: 'RASCUNHO',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    slots: [],
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible defaults: no conflicts, always available, no rotation history, no family.
  mockStorageService.checkSameMicroConflict.mockReturnValue({ hasConflict: false });
  mockStorageService.isPersonAvailable.mockReturnValue({ available: true });
  mockStorageService.getRotationHistory.mockReturnValue([]);
  mockStorageService.getFamilyById.mockReturnValue(undefined);
  mockStorageService.getFamilyMembers.mockReturnValue([]);
  mockStorageService.getFunctions.mockReturnValue([]);
});

describe('evaluateCandidate — hard disqualifications', () => {
  it('disqualifies an inactive volunteer', () => {
    const person = makePerson({ active: false });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(false);
    expect(result.totalScore).toBe(-9999);
    expect(result.disqualificationReason).toBe('Cadastro inativo');
  });

  it('disqualifies a volunteer who does not belong to the slot\'s micro', () => {
    const person = makePerson({ microIds: ['micro-outro'] });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(false);
    expect(result.disqualificationReason).toBe('Não participa deste Micro');
  });

  it('allows a volunteer already scheduled in a DIFFERENT micro on the same date (sequential service is fine)', () => {
    // e.g. Louvor in the first part of the service, then teaching kids afterwards.
    mockStorageService.checkSameMicroConflict.mockReturnValue({ hasConflict: false });
    const person = makePerson();
    const otherMicroSlot = makeSlot({ id: 'slot-other', microId: 'micro-professor', functionId: 'fn-prof', assignedPersonId: person.id });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [otherMicroSlot], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(true);
  });

  it('disqualifies a volunteer already holding an incompatible role in the SAME micro on the same date', () => {
    mockStorageService.checkSameMicroConflict.mockReturnValue({
      hasConflict: true,
      conflictingFunction: { name: 'Baixo', conflictGroup: 'INSTRUMENTO' }
    });
    mockStorageService.getFunctionById.mockReturnValue({ name: 'Guitarra', conflictGroup: 'INSTRUMENTO' });
    const person = makePerson();
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(false);
    expect(result.disqualificationReason).toContain('Baixo');
  });

  it('allows Voz + Instrumento together in the SAME micro on the same date (Louvor exception)', () => {
    mockStorageService.checkSameMicroConflict.mockReturnValue({
      hasConflict: true,
      conflictingFunction: { name: 'Vocal', conflictGroup: 'VOZ' }
    });
    mockStorageService.getFunctionById.mockReturnValue({ name: 'Violão', conflictGroup: 'INSTRUMENTO' });
    const person = makePerson();
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(true);
  });

  it('disqualifies a volunteer already assigned to an unclassified role in the same micro/date (batch)', () => {
    const person = makePerson();
    const otherSlot = makeSlot({ id: 'slot-other', functionId: 'fn-baixo', assignedPersonId: person.id });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [otherSlot], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(false);
    expect(result.disqualificationReason).toContain('Conflito');
  });

  it('disqualifies a volunteer whose family is set to "Ficar Separados" when a member already serves that day', () => {
    const person = makePerson({ id: 'p-1', familyId: 'fam-1' });
    const familyMember = makePerson({ id: 'p-2', familyId: 'fam-1' });
    const family: Family = { id: 'fam-1', name: 'Família Silva', priority: 'ALTA', schedulingPreference: 'SEPARADOS', createdAt: '2026-01-01' };

    mockStorageService.getFamilyById.mockReturnValue(family);
    mockStorageService.getFamilyMembers.mockReturnValue([familyMember]);

    const batchSlot = makeSlot({ id: 'slot-family', microId: 'micro-professor', functionId: 'fn-prof', assignedPersonId: 'p-2' });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [batchSlot], DEFAULT_WEIGHTS);

    expect(result.isEligible).toBe(false);
    expect(result.disqualificationReason).toContain('Família Silva');
  });

  it('disqualifies a volunteer who is unavailable that day', () => {
    mockStorageService.isPersonAvailable.mockReturnValue({ available: false, reason: 'Viagem de trabalho' });
    const person = makePerson();
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(false);
    expect(result.disqualificationReason).toBe('Viagem de trabalho');
  });
});

describe('evaluateCandidate — scoring for eligible volunteers', () => {
  it('scores an eligible volunteer with no registered function preference at the baseline', () => {
    const person = makePerson();
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.isEligible).toBe(true);
    expect(result.functionMatchScore).toBe(50);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it('rewards a volunteer who has the function registered as a preference', () => {
    const person = makePerson({
      functionPreferences: [
        {
          microId: 'micro-louvor',
          functionId: 'fn-vocal',
          experienceLevel: 'AVANCADO',
          preferredShifts: ['Noite'],
          preferredDays: []
        }
      ]
    });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [], DEFAULT_WEIGHTS);
    expect(result.functionMatchScore).toBe(100);
    expect(result.experienceScore).toBe(100);
    expect(result.preferenceScore).toBeGreaterThan(70);
  });

  it('gives a family co-scheduling bonus when a family member is already serving that day', () => {
    const person = makePerson({ id: 'p-1', familyId: 'fam-1' });
    const familyMember = makePerson({ id: 'p-2', familyId: 'fam-1' });
    const family: Family = { id: 'fam-1', name: 'Família Silva', priority: 'ALTA', createdAt: '2026-01-01' };

    mockStorageService.getFamilyById.mockReturnValue(family);
    mockStorageService.getFamilyMembers.mockReturnValue([familyMember]);

    const batchSlot = makeSlot({ id: 'slot-family', functionId: 'fn-baixo', assignedPersonId: 'p-2' });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [batchSlot], DEFAULT_WEIGHTS);

    expect(result.familyScore).toBe(85); // ALTA priority multiplier
    expect(result.reasons.some((r) => r.includes('Família Silva'))).toBe(true);
  });

  it('does not award a family bonus when priority is DESATIVADA', () => {
    const person = makePerson({ id: 'p-1', familyId: 'fam-1' });
    const familyMember = makePerson({ id: 'p-2', familyId: 'fam-1' });
    const family: Family = { id: 'fam-1', name: 'Família Silva', priority: 'DESATIVADA', createdAt: '2026-01-01' };

    mockStorageService.getFamilyById.mockReturnValue(family);
    mockStorageService.getFamilyMembers.mockReturnValue([familyMember]);

    const batchSlot = makeSlot({ id: 'slot-family', functionId: 'fn-baixo', assignedPersonId: 'p-2' });
    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot(), makeSchedule(), [batchSlot], DEFAULT_WEIGHTS);

    expect(result.familyScore).toBe(0);
  });

  it('penalizes recency for a volunteer who served very recently', () => {
    const person = makePerson();
    const recentHistory: RotationHistoryItem[] = [
      { id: 'h1', date: '2026-09-01', eventId: 'e1', microId: 'micro-louvor', functionId: 'fn-vocal', personId: person.id, coVolunteers: [] }
    ];
    mockStorageService.getRotationHistory.mockReturnValue(recentHistory);

    const result = schedulerAlgorithm.evaluateCandidate(person, makeSlot({ date: '2026-09-06' }), makeSchedule(), [], DEFAULT_WEIGHTS);
    // Served 5 days before slot date -> "served recently" bucket
    expect(result.recencyScore).toBe(60);
  });
});

describe('generateSchedule', () => {
  it('assigns the only eligible candidate to an open slot', () => {
    const person = makePerson();
    mockStorageService.getPeople.mockReturnValue([person]);
    mockStorageService.getMicros.mockReturnValue([{ id: 'micro-louvor', algorithmWeights: DEFAULT_WEIGHTS } as Micro]);

    const schedule = makeSchedule({ slots: [makeSlot()] });
    const result = schedulerAlgorithm.generateSchedule(schedule);

    expect(result.schedule.slots[0].assignedPersonId).toBe(person.id);
    expect(result.unfilledSlotsCount).toBe(0);
    expect(result.metrics.filledPercent).toBe(100);
  });

  it('leaves a slot unfilled when there are no eligible candidates', () => {
    const inactivePerson = makePerson({ active: false });
    mockStorageService.getPeople.mockReturnValue([inactivePerson]);
    mockStorageService.getMicros.mockReturnValue([{ id: 'micro-louvor', algorithmWeights: DEFAULT_WEIGHTS } as Micro]);

    const schedule = makeSchedule({ slots: [makeSlot()] });
    const result = schedulerAlgorithm.generateSchedule(schedule);

    expect(result.schedule.slots[0].assignedPersonId).toBeUndefined();
    expect(result.unfilledSlotsCount).toBe(1);
    expect(result.metrics.filledPercent).toBe(0);
  });

  it('never double-books the same person twice on the same date across different slots', () => {
    const person = makePerson();
    mockStorageService.getPeople.mockReturnValue([person]);
    mockStorageService.getMicros.mockReturnValue([{ id: 'micro-louvor', algorithmWeights: DEFAULT_WEIGHTS } as Micro]);

    const schedule = makeSchedule({
      slots: [
        makeSlot({ id: 'slot-1', functionId: 'fn-vocal' }),
        makeSlot({ id: 'slot-2', functionId: 'fn-baixo' })
      ]
    });
    const result = schedulerAlgorithm.generateSchedule(schedule);

    const assignedSlots = result.schedule.slots.filter((s) => s.assignedPersonId === person.id);
    // Only one of the two same-date slots can end up assigned to this sole candidate.
    expect(assignedSlots.length).toBe(1);
    expect(result.unfilledSlotsCount).toBe(1);
  });

  it('auto-fill only places a volunteer once across the whole schedule, leaving other dates unfilled', () => {
    const person = makePerson();
    mockStorageService.getPeople.mockReturnValue([person]);
    mockStorageService.getMicros.mockReturnValue([{ id: 'micro-louvor', algorithmWeights: DEFAULT_WEIGHTS } as Micro]);

    const schedule = makeSchedule({
      dates: ['2026-09-06', '2026-09-13'],
      slots: [
        makeSlot({ id: 'slot-1', date: '2026-09-06', functionId: 'fn-vocal' }),
        makeSlot({ id: 'slot-2', date: '2026-09-13', functionId: 'fn-vocal' })
      ]
    });
    const result = schedulerAlgorithm.generateSchedule(schedule);

    const assignedSlots = result.schedule.slots.filter((s) => s.assignedPersonId === person.id);
    // The sole candidate is only auto-assigned once total; the other Sunday is left open.
    expect(assignedSlots.length).toBe(1);
    expect(result.unfilledSlotsCount).toBe(1);
  });

  it('preserves manually-overridden assignments when preserveManualOverrides is true', () => {
    const person = makePerson({ id: 'p-1' });
    const otherPerson = makePerson({ id: 'p-2', name: 'Outra Pessoa' });
    mockStorageService.getPeople.mockReturnValue([person, otherPerson]);
    mockStorageService.getMicros.mockReturnValue([{ id: 'micro-louvor', algorithmWeights: DEFAULT_WEIGHTS } as Micro]);

    const manualSlot = makeSlot({
      id: 'slot-manual',
      assignedPersonId: person.id,
      assignedPersonName: person.name,
      manualOverride: true
    });
    const schedule = makeSchedule({ slots: [manualSlot] });

    const result = schedulerAlgorithm.generateSchedule(schedule, undefined, true);

    expect(result.schedule.slots[0].assignedPersonId).toBe(person.id);
    expect(result.schedule.slots[0].manualOverride).toBe(true);
  });
});

describe('createSlotsForSchedule', () => {
  it('creates one slot per date for each required position of a function', () => {
    const fn: MicroFunction = {
      id: 'fn-vocal',
      microId: 'micro-louvor',
      name: 'Vocal',
      criteria: {},
      defaultRequiredCount: 2
    };
    mockStorageService.getFunctions.mockReturnValue([fn]);

    const slots = schedulerAlgorithm.createSlotsForSchedule('sched-1', ['2026-09-06', '2026-09-13'], ['micro-louvor']);

    // 2 required positions x 2 dates = 4 slots
    expect(slots.length).toBe(4);
    expect(slots.filter((s) => s.date === '2026-09-06').length).toBe(2);
    expect(new Set(slots.map((s) => s.slotIndex))).toEqual(new Set([1, 2]));
  });
});
