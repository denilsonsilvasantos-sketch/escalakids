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

// Client-side placeholder only, used before the app has synced with the server.
// Real credentials are never baked into source: the actual admin account (and its
// password hash) is created by the server on first boot — see bootstrapAdminUser()
// in server.ts. This entry has no working password.
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Administrador',
    username: 'admin',
    role: 'ADMIN_LIDERANCA',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
