import { ProrationStrategy } from './interfaces';

/**
 * Pure date-fraction arithmetic only — no pricing/tax/currency rules. Given
 * a full-period amount and the sub-range actually in effect, returns the
 * prorated amount. Used for mid-cycle upgrades/downgrades, trial
 * conversions and cancellations.
 */
export function calculateProration(
  periodStart: Date,
  periodEnd: Date,
  effectiveFrom: Date,
  effectiveTo: Date,
  fullPeriodAmount: number,
  strategy: ProrationStrategy = ProrationStrategy.DAILY,
): number {
  if (strategy === ProrationStrategy.NONE) {
    return fullPeriodAmount;
  }

  const periodMs = periodEnd.getTime() - periodStart.getTime();
  if (periodMs <= 0) {
    return 0;
  }

  const clampedFrom = Math.max(effectiveFrom.getTime(), periodStart.getTime());
  const clampedTo = Math.min(effectiveTo.getTime(), periodEnd.getTime());
  const effectiveMs = Math.max(0, clampedTo - clampedFrom);

  const fraction = effectiveMs / periodMs;
  return Math.round(fullPeriodAmount * fraction * 100) / 100;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}
