/**
 * Utilities for formatting and parsing dates in Brazilian standard (DD/MM/AAAA).
 */

const DAYS_OF_WEEK_BR = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SHORT_DAYS_OF_WEEK_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_BR = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const SHORT_MONTHS_BR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Formats a date string (YYYY-MM-DD or ISO) to Brazilian standard DD/MM/AAAA.
 * If already in DD/MM/AAAA, returns as is.
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  
  // If already DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.substring(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // Handle ISO string
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

/**
 * Formats date to DD/MM (short format for tables/badges)
 */
export function formatShortDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const br = formatDateBR(dateStr);
  if (br.length >= 5) {
    return br.substring(0, 5);
  }
  return br;
}

/**
 * Formats date with day of week: e.g. "06/09/2026 (Dom)"
 */
export function formatDateWithWeekdayBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const br = formatDateBR(dateStr);
  const iso = parseDateBRToISO(br);
  
  if (iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = SHORT_DAYS_OF_WEEK_BR[dateObj.getDay()];
    return `${br} (${dayOfWeek})`;
  }
  
  return br;
}

/**
 * Formats ISO timestamp to DD/MM/AAAA às HH:mm
 */
export function formatDateTimeBR(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} às ${hours}:${mins}`;
  } catch {
    return isoString;
  }
}

/**
 * Converts DD/MM/AAAA to ISO format YYYY-MM-DD for internal storage/sorting
 */
export function parseDateBRToISO(brDateStr?: string | null): string {
  if (!brDateStr) return '';
  const trimmed = brDateStr.trim();
  
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Masks input string as DD/MM/AAAA while the user types
 */
export function maskDateBRInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Validates whether a DD/MM/AAAA string is a real calendar date
 */
export function isValidDateBR(dateStr: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
  const [d, m, y] = dateStr.split('/').map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1920 || y > 2100) return false;

  const testDate = new Date(y, m - 1, d);
  return (
    testDate.getFullYear() === y &&
    testDate.getMonth() === m - 1 &&
    testDate.getDate() === d
  );
}

/**
 * Friendly celebration string, e.g. "15 de Abril"
 */
export function formatBirthdayMonthBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const br = formatDateBR(dateStr);
  if (br.length >= 5) {
    const [day, month] = br.split('/');
    const monthName = MONTHS_BR[Number(month) - 1] || month;
    return `${Number(day)} de ${monthName}`;
  }
  return br;
}
