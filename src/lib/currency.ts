/**
 * GCL Currency Formatter — Centralized INR Display
 *
 * All monetary values are stored as raw numbers in the database.
 * This module formats them consistently as Indian Rupee amounts
 * using Crore (Cr) and Lakh (L) suffixes.
 *
 * Examples:
 *   50000000  → ₹5.00 Cr
 *   3000000   → ₹30.00 L
 *   2500000   → ₹25.00 L
 *   250000    → ₹2.50 L
 *   50000     → ₹50,000
 *   0         → ₹0
 */

const CRORE = 10_000_000;
const LAKH = 100_000;

/**
 * Format a raw numeric value to Indian Rupee display string.
 * Uses Cr for crores and L for lakhs. Falls back to comma-separated for smaller values.
 */
export function formatINR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '₹0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= CRORE) {
    const crores = absValue / CRORE;
    return `${sign}₹${crores.toFixed(2)} Cr`;
  }

  if (absValue >= LAKH) {
    const lakhs = absValue / LAKH;
    return `${sign}₹${lakhs.toFixed(2)} L`;
  }

  if (absValue === 0) return '₹0';

  // For values under 1 lakh, use comma formatting
  return `${sign}₹${absValue.toLocaleString('en-IN')}`;
}

/**
 * Format value with compact display (no decimal places for whole numbers).
 * Good for budget displays where precision matters less.
 */
export function formatINRCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '₹0';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= CRORE) {
    const crores = absValue / CRORE;
    const formatted = crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2);
    return `${sign}₹${formatted} Cr`;
  }

  if (absValue >= LAKH) {
    const lakhs = absValue / LAKH;
    const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2);
    return `${sign}₹${formatted} L`;
  }

  if (absValue === 0) return '₹0';

  return `${sign}₹${absValue.toLocaleString('en-IN')}`;
}

/**
 * Parse a formatted INR string back to a raw number.
 * Handles both Cr and L suffixes.
 */
export function parseINR(formatted: string): number {
  const cleaned = formatted.replace(/[₹,\s]/g, '').trim();

  if (cleaned.endsWith('Cr')) {
    return parseFloat(cleaned.replace('Cr', '')) * CRORE;
  }

  if (cleaned.endsWith('L')) {
    return parseFloat(cleaned.replace('L', '')) * LAKH;
  }

  return parseFloat(cleaned) || 0;
}
