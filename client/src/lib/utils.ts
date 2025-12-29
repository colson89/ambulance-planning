import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the day of month from a date value using LOCAL time.
 * 
 * CRITICAL TIMEZONE FIX: Old data stored as "2026-02-06 23:00:00" (UTC) should display as
 * February 7th in CET timezone. We use LOCAL getDate() instead of getUTCDate() so that
 * the browser's timezone conversion gives us the correct calendar day.
 * 
 * Examples:
 * - "2026-02-06 23:00:00" (UTC) → Date.getDate() in CET = 7 ✓
 * - "2026-02-07 12:00:00" (UTC) → Date.getDate() in CET = 7 ✓
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The day of month (1-31) in LOCAL timezone
 */
export function getUTCDay(dateValue: Date | string | number): number {
  if (typeof dateValue === 'string') {
    // Handle space-separated format: "2026-02-06 23:00:00" → ensure parsed as UTC
    if (dateValue.includes(' ') && !dateValue.includes('T')) {
      dateValue = dateValue.replace(' ', 'T') + 'Z';
    }
  }
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  // Use LOCAL getDate() for correct timezone conversion
  return date.getDate();
}

/**
 * Extract the month (1-12) from a date value using LOCAL time.
 * See getUTCDay for timezone fix explanation.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The month (1-12) in LOCAL timezone
 */
export function getUTCMonth(dateValue: Date | string | number): number {
  if (typeof dateValue === 'string') {
    if (dateValue.includes(' ') && !dateValue.includes('T')) {
      dateValue = dateValue.replace(' ', 'T') + 'Z';
    }
  }
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  return date.getMonth() + 1; // Use LOCAL getMonth()
}

/**
 * Extract the year from a date value using LOCAL time.
 * See getUTCDay for timezone fix explanation.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The year in LOCAL timezone
 */
export function getUTCYear(dateValue: Date | string | number): number {
  if (typeof dateValue === 'string') {
    if (dateValue.includes(' ') && !dateValue.includes('T')) {
      dateValue = dateValue.replace(' ', 'T') + 'Z';
    }
  }
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  return date.getFullYear(); // Use LOCAL getFullYear()
}

/**
 * Format a date value to YYYY-MM-DD string using LOCAL time.
 * This ensures dates stored as "2026-02-06 23:00:00" (UTC) display as "2026-02-07" in CET.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The date formatted as YYYY-MM-DD in LOCAL timezone
 */
export function formatUTCDate(dateValue: Date | string | number): string {
  if (typeof dateValue === 'string') {
    if (dateValue.includes(' ') && !dateValue.includes('T')) {
      dateValue = dateValue.replace(' ', 'T') + 'Z';
    }
  }
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
