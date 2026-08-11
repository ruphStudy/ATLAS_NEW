export enum BillingPeriodStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  BILLED = 'BILLED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
  REFUNDED = 'REFUNDED',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum BillingTriggerType {
  RENEWAL = 'RENEWAL',
  UPGRADE = 'UPGRADE',
  DOWNGRADE = 'DOWNGRADE',
  TRIAL_CONVERSION = 'TRIAL_CONVERSION',
  CANCELLATION = 'CANCELLATION',
  MID_CYCLE_CHANGE = 'MID_CYCLE_CHANGE',
  MANUAL = 'MANUAL',
  ONE_TIME = 'ONE_TIME',
}

export enum BillingItemType {
  SUBSCRIPTION_CHARGE = 'SUBSCRIPTION_CHARGE',
  PRORATION = 'PRORATION',
  DISCOUNT = 'DISCOUNT',
  CREDIT = 'CREDIT',
  TAX = 'TAX',
  OVERAGE = 'OVERAGE',
  ADJUSTMENT = 'ADJUSTMENT',
  ONE_TIME_CHARGE = 'ONE_TIME_CHARGE',
}

export enum BillingHistoryChangeType {
  GENERATED = 'GENERATED',
  RECALCULATED = 'RECALCULATED',
  BILLED = 'BILLED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  OVERDUE = 'OVERDUE',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  ADJUSTED = 'ADJUSTED',
}

export enum BillingRuleScope {
  GLOBAL = 'GLOBAL',
  COUNTRY = 'COUNTRY',
  REGION = 'REGION',
  PLAN = 'PLAN',
  TENANT = 'TENANT',
}

export enum ProrationStrategy {
  DAILY = 'DAILY',
  NONE = 'NONE',
}

export enum BillingEngineEvent {
  BILLING_PERIOD_GENERATED = 'billing-engine.billing_period_generated',
  BILLING_PERIOD_RECALCULATED = 'billing-engine.billing_period_recalculated',
  BILLING_PERIOD_BILLED = 'billing-engine.billing_period_billed',
  PAYMENT_RECORDED = 'billing-engine.payment_recorded',
  BILLING_PERIOD_OVERDUE = 'billing-engine.billing_period_overdue',
  BILLING_PERIOD_VOIDED = 'billing-engine.billing_period_voided',
  BILLING_PERIOD_REFUNDED = 'billing-engine.billing_period_refunded',
  RECONCILIATION_COMPLETED = 'billing-engine.reconciliation_completed',
}

/** Caller-supplied — Billing Engine never queries a generic Usage Tracking module (none exists) or a tax/currency rate table; it only performs the arithmetic over inputs it's given. */
export interface IUsageOverageInput {
  resourceKey: string;
  usageAmount: number;
  limit: number;
}

export interface IAdditionalItemInput {
  type: BillingItemType;
  description: string;
  amount: number;
  quantity?: number;
  unitAmount?: number;
  resourceKey?: string;
  calculationInput?: Record<string, unknown>;
}

export interface IBillingItem {
  id: string;
  billingPeriodId: string;
  workspaceId: string;
  type: BillingItemType;
  description: string;
  quantity: number | null;
  unitAmount: number | null;
  amount: number;
  currency: string;
  planKey: string | null;
  resourceKey: string | null;
  calculationInput: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IBillingPeriod {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  subscriptionId: string | null;
  scopeKey: string;
  triggerType: BillingTriggerType;
  billingCycle: BillingCycle;
  customCycleDays: number | null;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  currency: string;
  status: BillingPeriodStatus;
  subtotal: number;
  discountTotal: number;
  creditTotal: number;
  taxTotal: number;
  overageTotal: number;
  adjustmentTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  idempotencyKey: string | null;
  externalReference: Record<string, unknown> | null;
  version: number;
  generatedAt: Date;
  billedAt: Date | null;
  paidAt: Date | null;
  voidedAt: Date | null;
  refundedAt: Date | null;
  voidReason: string | null;
  refundReason: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillingHistory {
  id: string;
  billingPeriodId: string;
  workspaceId: string;
  changeType: BillingHistoryChangeType;
  fromStatus: BillingPeriodStatus | null;
  toStatus: BillingPeriodStatus;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Array of `{resourceKey, rate, unit}` — per-unit overage price, never a hardcoded rate. */
export interface IOverageRate {
  resourceKey: string;
  rate: number;
  unit?: string;
}

export interface IBillingRule {
  id: string;
  scope: BillingRuleScope;
  scopeKey: string;
  workspaceId: string | null;
  organizationId: string | null;
  planKey: string | null;
  country: string | null;
  region: string | null;
  priority: number;
  taxRatePercent: number | null;
  prorationStrategy: ProrationStrategy;
  gracePeriodDays: number | null;
  overageRates: IOverageRate[] | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResolvedBillingRule {
  taxRatePercent: number;
  prorationStrategy: ProrationStrategy;
  gracePeriodDays: number;
  overageRates: IOverageRate[];
}

export interface IReconciliationReport {
  billingPeriodId: string;
  isConsistent: boolean;
  discrepancies: string[];
  checkedAt: Date;
}

export interface IBillingEngineEventPayload {
  event: BillingEngineEvent;
  billingPeriodId: string;
  workspaceId: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
