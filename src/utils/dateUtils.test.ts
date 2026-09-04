import { describe, it, expect } from 'vitest';
import {
  formatDateBR,
  formatShortDateBR,
  formatDateWithWeekdayBR,
  formatDateTimeBR,
  parseDateBRToISO,
  maskDateBRInput,
  isValidDateBR,
  formatBirthdayMonthBR
} from './dateUtils';

describe('formatDateBR', () => {
  it('converts YYYY-MM-DD to DD/MM/AAAA', () => {
    expect(formatDateBR('2026-09-06')).toBe('06/09/2026');
  });

  it('passes through a value already in DD/MM/AAAA', () => {
    expect(formatDateBR('06/09/2026')).toBe('06/09/2026');
  });

  it('handles a full ISO timestamp by taking only the date part', () => {
    expect(formatDateBR('2026-09-06T00:00:00.000Z')).toBe('06/09/2026');
  });

  it('returns an empty string for null/undefined/empty input', () => {
    expect(formatDateBR(undefined)).toBe('');
    expect(formatDateBR(null)).toBe('');
    expect(formatDateBR('')).toBe('');
  });
});

describe('formatShortDateBR', () => {
  it('returns just DD/MM', () => {
    expect(formatShortDateBR('2026-09-06')).toBe('06/09');
  });
});

describe('parseDateBRToISO', () => {
  it('converts DD/MM/AAAA to YYYY-MM-DD', () => {
    expect(parseDateBRToISO('06/09/2026')).toBe('2026-09-06');
  });

  it('passes through a value already in YYYY-MM-DD', () => {
    expect(parseDateBRToISO('2026-09-06')).toBe('2026-09-06');
  });

  it('returns an empty string for empty input', () => {
    expect(parseDateBRToISO('')).toBe('');
    expect(parseDateBRToISO(undefined)).toBe('');
  });

  it('round-trips with formatDateBR', () => {
    const iso = '2026-12-25';
    expect(parseDateBRToISO(formatDateBR(iso))).toBe(iso);
  });
});

describe('formatDateWithWeekdayBR', () => {
  it('appends the correct Brazilian weekday abbreviation', () => {
    // 2026-09-06 is a Sunday
    expect(formatDateWithWeekdayBR('2026-09-06')).toBe('06/09/2026 (Dom)');
  });

  it('returns an empty string for empty input', () => {
    expect(formatDateWithWeekdayBR('')).toBe('');
  });
});

describe('formatDateTimeBR', () => {
  it('formats an ISO timestamp with date and time', () => {
    const result = formatDateTimeBR('2026-09-06T14:30:00.000Z');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/);
  });

  it('returns an empty string for empty input', () => {
    expect(formatDateTimeBR('')).toBe('');
  });

  it('falls back to the raw string for an invalid date', () => {
    expect(formatDateTimeBR('not-a-date')).toBe('not-a-date');
  });
});

describe('maskDateBRInput', () => {
  it('progressively inserts slashes as digits are typed', () => {
    expect(maskDateBRInput('0')).toBe('0');
    expect(maskDateBRInput('06')).toBe('06');
    expect(maskDateBRInput('060')).toBe('06/0');
    expect(maskDateBRInput('0609')).toBe('06/09');
    expect(maskDateBRInput('06092026')).toBe('06/09/2026');
  });

  it('strips non-digit characters and caps at 8 digits', () => {
    expect(maskDateBRInput('06/09/2026extra')).toBe('06/09/2026');
  });
});

describe('isValidDateBR', () => {
  it('accepts a real calendar date', () => {
    expect(isValidDateBR('06/09/2026')).toBe(true);
  });

  it('rejects an impossible calendar date (e.g. Feb 30th)', () => {
    expect(isValidDateBR('30/02/2026')).toBe(false);
  });

  it('rejects malformed strings', () => {
    expect(isValidDateBR('2026-09-06')).toBe(false);
    expect(isValidDateBR('6/9/2026')).toBe(false);
    expect(isValidDateBR('')).toBe(false);
  });

  it('rejects out-of-range years', () => {
    expect(isValidDateBR('01/01/1800')).toBe(false);
    expect(isValidDateBR('01/01/2200')).toBe(false);
  });
});

describe('formatBirthdayMonthBR', () => {
  it('formats as "day de Month"', () => {
    expect(formatBirthdayMonthBR('2026-04-15')).toBe('15 de Abril');
  });

  it('returns an empty string for empty input', () => {
    expect(formatBirthdayMonthBR('')).toBe('');
  });
});
