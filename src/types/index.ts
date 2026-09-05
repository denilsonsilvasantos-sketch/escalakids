export type UserRole =
  | 'ADMIN_LIDERANCA'
  | 'LIDER_MACRO'
  | 'LIDER_MICRO'
  | 'COORDENADOR'
  | 'VOLUNTARIO'
  | 'OBSERVADOR';

export type ScheduleStatus = 'RASCUNHO' | 'EM_REVISAO' | 'CONFIRMADA' | 'PUBLICADA' | 'CANCELADA';

export type ExperienceLevel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

export type FamilyPriority = 'MUITO_ALTA' | 'ALTA' | 'MEDIA' | 'BAIXA' | 'DESATIVADA';

export interface UserAccount {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password?: string; // Stored password hash / plain for app authentication
  role: UserRole;
  avatar?: string;
  // If LIDER_MACRO, which micro IDs they can manage
  allowedMicroIds?: string[];
  // If LIDER_MICRO, the primary micro ID
  primaryMicroId?: string;
  // If VOLUNTARIO, links to their Person ID in the database
  personId?: string;
  // Phone/WhatsApp for volunteer contact
  whatsapp?: string;
  // User delegation metadata
  createdBy?: string;
  createdByName?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupabaseSyncState {
  isConnected: boolean;
  isConfigured: boolean;
  supabaseUrl?: string;
  lastSyncedAt?: string;
  syncError?: string;
  isSyncing: boolean;
}

export type ClassroomPresetKey =
  | 'DOMINGO_MANHA'
  | 'DOMINGO_NOITE'
  | 'CULTO_ESPECIAL_2_TURMAS'
  | 'CULTO_ESPECIAL_3_TURMAS'
  | 'PERSONALIZADO';

export interface ClassroomPresetConfig {
  key: ClassroomPresetKey;
  label: string;
  description: string;
  ageGroups: string[];
}

export interface MacroUnit {
  id: string;
  name: string;
  description: string;
}

export interface FunctionCriteriaConfig {
  hasAgeGroupPreference?: boolean;
  allowedAgeGroups?: string[]; // e.g. ["3 a 6 anos", "5 anos", "6 anos", "7 anos", "8 anos", "9 e 10 anos", "11 e 12 anos"]
  hasShiftPreference?: boolean;
  allowedShifts?: string[]; // e.g. ["MANHA", "NOITE", "ESPECIAL"] or ["Manhã", "Noite", "Culto Especial"]
  specialEventNames?: string; // e.g. "Culto de Casais, Culto de Mulheres"
  hasDayPreference?: boolean;
  allowedDays?: string[]; // e.g. ["Domingo", "Quarta", "Sábado"]
  requiresExperience?: boolean;
  allowedExperienceLevels?: ExperienceLevel[];
  defaultSlotsRequired?: number;
  customNotes?: string;
}

export type FunctionConflictGroup = 'VOZ' | 'INSTRUMENTO' | 'TECNICA';

export interface MicroFunction {
  id: string;
  microId: string;
  name: string;
  description?: string;
  category?: string; // e.g. "Louvor 3 a 6", "Sala 5 anos", "Geral"
  criteria: FunctionCriteriaConfig;
  defaultRequiredCount: number;
  // Used to decide whether a volunteer can hold two roles in the SAME micro on
  // the SAME date at once (e.g. Louvor: Voz + Instrumento is fine, but two
  // Instrumento/Técnica roles conflict — a person can't play two instruments,
  // or run two sound boards, simultaneously). Left unset for micros where this
  // doesn't apply (a person can only ever hold one role per micro per date).
  conflictGroup?: FunctionConflictGroup;
  // e.g. "Participação Especial": a guest slot that doesn't need a registered
  // volunteer — the leader just types a name directly into the schedule slot,
  // and the auto-fill assistant skips it entirely (there's no candidate pool).
  allowsGuestEntry?: boolean;
  // Display position among this micro's functions (lower = earlier), everywhere
  // a schedule lists them — set explicitly via the up/down controls in "Micros
  // & Funções" rather than left to whatever order rows happen to be stored in.
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlgorithmWeights {
  availability: number; // default 100
  correctFunction: number; // default 100
  volunteerPreference: number; // default 80
  frequencyBalance: number; // default 90
  recency: number; // default 80
  rotation: number; // default 80
  family: number; // default 60
  experience: number; // default 50
}

export interface Micro {
  id: string;
  name: string;
  description?: string;
  leaderName?: string;
  leaderId?: string;
  status: 'ATIVO' | 'INATIVO';
  color: string;
  iconName?: string;
  defaultShifts?: string[];
  specialEventNames?: string;
  algorithmWeights?: AlgorithmWeights;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonMicroFunctionPreference {
  microId: string;
  functionId: string;
  experienceLevel: ExperienceLevel;
  preferredShifts: string[]; // ["Manhã", "Noite"]
  preferredDays: string[]; // ["Domingo", "Quarta"]
  preferredAgeGroups?: string[]; // ["9 e 10 anos"]
  notes?: string;
}

export interface AvailabilityRule {
  id: string;
  personId: string;
  type: 'RECORRENTE' | 'DATA_ESPECIFICA';
  dayOfWeek?: number; // 0=Domingo, 3=Quarta, 6=Sábado
  shift?: 'MANHA' | 'NOITE' | 'ESPECIAL' | 'AMBOS' | 'QUALQUER';
  specificDate?: string; // YYYY-MM-DD
  isAvailable: boolean; // true = Available, false = Unavailable
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  birthDate: string; // YYYY-MM-DD
  phone: string;
  whatsapp: string;
  email?: string;
  avatarUrl?: string;
  notes?: string;
  familyId?: string;
  active: boolean;
  microIds: string[];
  functionPreferences: PersonMicroFunctionPreference[];
  createdAt: string;
  updatedAt: string;
}

export type FamilySchedulingPreference = 'JUNTOS' | 'SEPARADOS' | 'SEM_PREFERENCIA';

export interface Family {
  id: string;
  name: string; // e.g. "Família Silva"
  priority: FamilyPriority;
  // Whether members of this family should be pushed together on the same day
  // (default, bonus-only), actively kept apart on the same day (hard rule —
  // e.g. they said they don't want to serve together), or left with no rule
  // either way. Independent from `priority`, which only tunes bonus strength.
  schedulingPreference?: FamilySchedulingPreference;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleEvent {
  id: string;
  name: string; // e.g. "Culto da Noite", "Culto da Manhã", "Conferência Kids"
  defaultTime: string; // "19:00"
  shift: 'MANHA' | 'NOITE' | 'ESPECIAL' | 'TARDE' | 'AMBOS';
  dayOfWeek: number; // 0 for Sunday
}

export interface ScheduleSlot {
  id: string;
  scheduleId: string;
  date: string; // YYYY-MM-DD
  microId: string;
  functionId: string;
  sectionTitle?: string; // e.g. "3 a 6 anos", "9 e 10 anos", "Refeitório"
  slotIndex: number; // 1, 2, 3 (for e.g. Auxiliar 1, Auxiliar 2)
  assignedPersonId?: string;
  assignedPersonName?: string;
  manualOverride: boolean;
  score?: number;
  scoreBreakdown?: {
    availabilityScore: number;
    functionMatchScore: number;
    preferenceScore: number;
    frequencyScore: number;
    recencyScore: number;
    rotationScore: number;
    familyScore: number;
    experienceScore: number;
    totalScore: number;
    reasons: string[];
  };
  conflictWarning?: string;
}

export interface Schedule {
  id: string;
  title: string; // e.g. "Escala Setembro 2026 - Culto da Noite"
  eventId?: string;
  eventName: string;
  period?: string;
  shift: 'MANHA' | 'NOITE' | 'ESPECIAL' | 'TARDE' | 'AMBOS';
  dates: string[]; // ["2026-09-06", "2026-09-13", "2026-09-20", "2026-09-27"]
  microIds: string[]; // Included micros in this schedule
  status: ScheduleStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  slots: ScheduleSlot[];
  qualityMetrics?: {
    availabilityPercent: number;
    filledPercent: number;
    balancePercent: number;
    rotationPercent: number;
    familyPercent: number;
    preferencePercent: number;
  };
}

export interface RotationHistoryItem {
  id: string;
  date: string;
  eventId: string;
  microId: string;
  functionId: string;
  personId: string;
  coVolunteers: string[]; // Person IDs who served in the same micro/event that day
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  targetType: 'PERSON' | 'MICRO' | 'SCHEDULE' | 'FAMILY' | 'FUNCTION' | 'SYSTEM';
}

export interface BirthdayNotification {
  personId: string;
  personName: string;
  birthDate: string;
  nextBirthday: string;
  ageTurning: number;
  daysRemaining: number;
  category: 'HOJE' | 'AMANHA' | 'PROXIMOS_7' | 'PROXIMOS_30' | 'ESTE_MES' | 'OUTROS';
  micros: string[];
  whatsapp: string;
  phone: string;
}
