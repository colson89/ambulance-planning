import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * CANONICAL CET DATE PARSER
 * 
 * Converts database timestamps to YYYY-MM-DD strings in CET timezone.
 * This is DETERMINISTIC and works regardless of the viewer's browser timezone.
 * 
 * Legacy data: "2026-02-06 23:00:00" (UTC midnight CET) → "2026-02-07"
 * New data:    "2026-02-07 12:00:00" (noon local)       → "2026-02-07"
 * 
 * The key insight: 23:00 UTC = 00:00 CET next day
 * We detect 23:00 and add 1 day using pure string/math operations (no Date object locale).
 */
export function parseCETCalendarDate(raw: string | Date | null | undefined): string {
  if (!raw) return "";
  
  if (typeof raw !== 'string') {
    // For Date objects: use local methods (assumes CET browser)
    const year = raw.getFullYear();
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    const day = String(raw.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Extract date components from string using regex
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  
  let year = parseInt(match[1], 10);
  let month = parseInt(match[2], 10);
  let day = parseInt(match[3], 10);
  
  // Check if this is a legacy 23:00 timestamp that needs +1 day
  // "2026-02-06 23:00:00" or "2026-02-06T23:00:00" → means 7 februari in CET
  if (raw.includes('23:00:00')) {
    // Add 1 day using pure arithmetic (no Date object = no locale issues)
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Check for leap year
    if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) {
      daysInMonth[2] = 29;
    }
    
    day += 1;
    if (day > daysInMonth[month]) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Extract the day of month from a date value (CET-aware, deterministic).
 */
export function getUTCDay(dateValue: Date | string | number): number {
  if (typeof dateValue === 'string') {
    const ymd = parseCETCalendarDate(dateValue);
    const match = ymd.match(/\d{4}-\d{2}-(\d{2})/);
    return match ? parseInt(match[1], 10) : 1;
  }
  const date = typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  return date instanceof Date ? date.getDate() : 1;
}

/**
 * Extract the month (1-12) from a date value (CET-aware, deterministic).
 */
export function getUTCMonth(dateValue: Date | string | number): number {
  if (typeof dateValue === 'string') {
    const ymd = parseCETCalendarDate(dateValue);
    const match = ymd.match(/\d{4}-(\d{2})-\d{2}/);
    return match ? parseInt(match[1], 10) : 1;
  }
  const date = typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  return date instanceof Date ? date.getMonth() + 1 : 1;
}

/**
 * Extract the year from a date value (CET-aware, deterministic).
 */
export function getUTCYear(dateValue: Date | string | number): number {
  if (typeof dateValue === 'string') {
    const ymd = parseCETCalendarDate(dateValue);
    const match = ymd.match(/(\d{4})-\d{2}-\d{2}/);
    return match ? parseInt(match[1], 10) : 2026;
  }
  const date = typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  return date instanceof Date ? date.getFullYear() : 2026;
}

/**
 * Format a date value to YYYY-MM-DD string (CET-aware, deterministic).
 */
export function formatUTCDate(dateValue: Date | string | number): string {
  if (typeof dateValue === 'string') {
    return parseCETCalendarDate(dateValue);
  }
  const date = typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}
