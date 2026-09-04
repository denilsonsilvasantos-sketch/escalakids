import {
  Micro,
  MicroFunction,
  Person,
  Family,
  AvailabilityRule,
  Schedule,
  UserAccount,
  RotationHistoryItem,
  AuditLog
} from '../types';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Administrador',
    username: 'admin',
    email: 'denilson.silva.santos@gmail.com',
    password: 'admin',
    role: 'ADMIN_LIDERANCA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    whatsapp: '47998871122',
    allowedMicroIds: []
  }
];

export const INITIAL_MICROS: Micro[] = [];
export const INITIAL_FUNCTIONS: MicroFunction[] = [];
export const INITIAL_FAMILIES: Family[] = [];
export const INITIAL_PEOPLE: Person[] = [];
export const INITIAL_AVAILABILITIES: AvailabilityRule[] = [];
export const INITIAL_SCHEDULES: Schedule[] = [];
export const INITIAL_ROTATION_HISTORY: RotationHistoryItem[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
