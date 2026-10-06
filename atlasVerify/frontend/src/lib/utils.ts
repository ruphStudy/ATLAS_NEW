import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names safely.
 * Resolves conflicts (e.g., `p-4` and `p-8`) correctly.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency.
 */
export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date to a readable string.
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Format a date as a short relative time string (e.g. "5m ago", "3d ago").
 */
export function formatDistanceToNow(date: string | Date): string {
  const then = new Date(date).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  const units: Array<[string, number]> = [
    ['y', 60 * 60 * 24 * 365],
    ['mo', 60 * 60 * 24 * 30],
    ['d', 60 * 60 * 24],
    ['h', 60 * 60],
    ['m', 60],
  ];

  for (const [label, seconds] of units) {
    const value = Math.floor(diffSeconds / seconds);
    if (value >= 1) return `${value}${label} ago`;
  }
  return 'just now';
}
