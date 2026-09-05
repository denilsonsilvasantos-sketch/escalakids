import { Person } from '../types';

// Used wherever a person's name is displayed inside a schedule grid/export,
// so long full names don't blow up the layout of the compact slot cells.
export function getScheduleDisplayName(person: Pick<Person, 'name' | 'nickname'> | undefined | null): string {
  if (!person) return '';
  return person.nickname?.trim() || person.name;
}
