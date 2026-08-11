import { SubscriptionBillingCycle } from './interfaces';

/**
 * Pure date arithmetic only — no pricing, currency or proration math. That
 * is the Billing Engine's job; this module only needs to know when the
 * *current period* ends so it can drive lifecycle transitions (renew,
 * expire, apply a scheduled change).
 */
export function computeNextPeriodEnd(from: Date, cycle: SubscriptionBillingCycle, customDays?: number | null): Date {
  const next = new Date(from);
  switch (cycle) {
    case SubscriptionBillingCycle.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      return next;
    case SubscriptionBillingCycle.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      return next;
    case SubscriptionBillingCycle.YEARLY:
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case SubscriptionBillingCycle.CUSTOM:
      next.setDate(next.getDate() + (customDays && customDays > 0 ? customDays : 30));
      return next;
    default:
      return next;
  }
}
