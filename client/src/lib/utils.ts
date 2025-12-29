import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract the day of month from a date value using UTC to avoid timezone drift.
 * This is critical for preference/shift dates which are stored at noon UTC.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The day of month (1-31) in UTC
 */
export function getUTCDay(dateValue: Date | string | number): number {
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  return date.getUTCDate();
}

/**
 * Extract the month (1-12) from a date value using UTC to avoid timezone drift.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The month (1-12) in UTC
 */
export function getUTCMonth(dateValue: Date | string | number): number {
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  return date.getUTCMonth() + 1; // JavaScript months are 0-indexed
}

/**
 * Extract the year from a date value using UTC to avoid timezone drift.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The year in UTC
 */
export function getUTCYear(dateValue: Date | string | number): number {
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  return date.getUTCFullYear();
}

/**
 * Format a date value to YYYY-MM-DD string using UTC to avoid timezone drift.
 * This ensures consistent date formatting for dates stored at noon UTC.
 * 
 * @param dateValue - A Date object, ISO string, or any date format
 * @returns The date formatted as YYYY-MM-DD in UTC
 */
export function formatUTCDate(dateValue: Date | string | number): string {
  const date = typeof dateValue === 'string' || typeof dateValue === 'number' 
    ? new Date(dateValue) 
    : dateValue;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
