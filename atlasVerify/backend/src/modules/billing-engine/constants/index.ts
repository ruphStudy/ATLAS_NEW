import { BillingPeriodStatus } from '../interfaces';

export const BILLING_ENGINE_MODULE = 'billing-engine';

/** Roles permitted to manage billing records for a workspace. */
export const BILLING_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const BILLING_ALLOWED_TRANSITIONS: Record<BillingPeriodStatus, BillingPeriodStatus[]> = {
  [BillingPeriodStatus.DRAFT]: [BillingPeriodStatus.PENDING, BillingPeriodStatus.BILLED, BillingPeriodStatus.VOID],
  [BillingPeriodStatus.PENDING]: [BillingPeriodStatus.BILLED, BillingPeriodStatus.VOID],
  [BillingPeriodStatus.BILLED]: [BillingPeriodStatus.PARTIALLY_PAID, BillingPeriodStatus.PAID, BillingPeriodStatus.OVERDUE, BillingPeriodStatus.VOID],
  [BillingPeriodStatus.PARTIALLY_PAID]: [BillingPeriodStatus.PAID, BillingPeriodStatus.OVERDUE, BillingPeriodStatus.REFUNDED],
  [BillingPeriodStatus.OVERDUE]: [BillingPeriodStatus.PARTIALLY_PAID, BillingPeriodStatus.PAID, BillingPeriodStatus.VOID],
  [BillingPeriodStatus.PAID]: [BillingPeriodStatus.REFUNDED],
  [BillingPeriodStatus.VOID]: [],
  [BillingPeriodStatus.REFUNDED]: [],
};

/** Statuses still open for adjustment/recalculation — a period that is VOID/REFUNDED/PAID is closed to new line items. */
export const OPEN_BILLING_STATUSES: BillingPeriodStatus[] = [BillingPeriodStatus.DRAFT, BillingPeriodStatus.PENDING, BillingPeriodStatus.BILLED, BillingPeriodStatus.PARTIALLY_PAID, BillingPeriodStatus.OVERDUE];

export const BILLING_SORT_FIELDS = ['createdAt', 'periodStart', 'dueDate', 'total'] as const;

/** In-code fallback only when no `BillingRule` matches at any scope — never presented as a "real" tax/proration policy, just keeps calculation deterministic when the catalog is empty. */
export const DEFAULT_RESOLVED_BILLING_RULE = {
  taxRatePercent: 0,
  prorationStrategy: 'DAILY',
  gracePeriodDays: 0,
  overageRates: [] as Array<{ resourceKey: string; rate: number; unit?: string }>,
};
