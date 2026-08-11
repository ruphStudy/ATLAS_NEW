export enum SubscriptionScope {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

export enum SubscriptionType {
  FREE = 'FREE',
  TRIAL = 'TRIAL',
  PAID = 'PAID',
  CUSTOM = 'CUSTOM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionBillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  PAUSED = 'PAUSED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum SubscriptionChangeType {
  CREATED = 'CREATED',
  ACTIVATED = 'ACTIVATED',
  PLAN_CHANGED = 'PLAN_CHANGED',
  RENEWED = 'RENEWED',
  PAST_DUE = 'PAST_DUE',
  PAUSED = 'PAUSED',
  RESUMED = 'RESUMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  TRIAL_CONVERTED = 'TRIAL_CONVERTED',
  TRIAL_EXPIRED = 'TRIAL_EXPIRED',
  ADMIN_OVERRIDE = 'ADMIN_OVERRIDE',
}

export enum PlanChangeEffective {
  IMMEDIATE = 'IMMEDIATE',
  PERIOD_END = 'PERIOD_END',
}

/** Caller-declared direction of a plan change — this module never compares plan tiers itself, since it does not own the Plan Management catalog. */
export enum PlanChangeDirection {
  UPGRADE = 'UPGRADE',
  DOWNGRADE = 'DOWNGRADE',
  LATERAL = 'LATERAL',
}

export enum SubscriptionManagementEvent {
  SUBSCRIPTION_CREATED = 'subscription-management.subscription_created',
  SUBSCRIPTION_ACTIVATED = 'subscription-management.subscription_activated',
  SUBSCRIPTION_CHANGED = 'subscription-management.subscription_changed',
  SUBSCRIPTION_RENEWED = 'subscription-management.subscription_renewed',
  SUBSCRIPTION_PAST_DUE = 'subscription-management.subscription_past_due',
  SUBSCRIPTION_PAUSED = 'subscription-management.subscription_paused',
  SUBSCRIPTION_RESUMED = 'subscription-management.subscription_resumed',
  SUBSCRIPTION_CANCELLED = 'subscription-management.subscription_cancelled',
  SUBSCRIPTION_EXPIRED = 'subscription-management.subscription_expired',
  SUBSCRIPTION_SUSPENDED = 'subscription-management.subscription_suspended',
}

/** Structured hint for the (separate) Billing Engine to compute actual proration — never the proration math itself. */
export interface IProrationReference {
  fromPlanKey: string | null;
  toPlanKey: string;
  fromBillingCycle: SubscriptionBillingCycle | null;
  toBillingCycle: SubscriptionBillingCycle;
  changeType: PlanChangeDirection;
  effectiveAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface IScheduledChange {
  toPlanKey: string;
  toBillingCycle?: SubscriptionBillingCycle;
  changeType: PlanChangeDirection;
  requestedBy: string;
  requestedAt: string;
  reason?: string;
}

export interface ISubscription {
  id: string;
  scope: SubscriptionScope;
  organizationId: string | null;
  workspaceId: string | null;
  scopeKey: string;
  type: SubscriptionType;
  planKey: string;
  billingCycle: SubscriptionBillingCycle;
  customBillingCycleDays: number | null;
  status: SubscriptionStatus;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  startAt: Date;
  endAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  renewalDate: Date | null;
  gracePeriodDays: number;
  gracePeriodEndsAt: Date | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  pausedAt: Date | null;
  pauseReason: string | null;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  scheduledChange: IScheduledChange | null;
  prorationReference: IProrationReference | null;
  isAdminOverride: boolean;
  adminOverrideReason: string | null;
  allowMultipleActive: boolean;
  metadata: Record<string, unknown>;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriptionHistory {
  id: string;
  subscriptionId: string;
  scopeKey: string;
  changeType: SubscriptionChangeType;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus;
  fromPlanKey: string | null;
  toPlanKey: string | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** The minimal reference other future modules (Quota, Feature Flags) can key entitlement decisions off — never entitlement rules themselves. */
export interface ISubscriptionEntitlementReference {
  subscriptionId: string;
  scope: SubscriptionScope;
  status: SubscriptionStatus;
  type: SubscriptionType;
  planKey: string;
  isTrial: boolean;
  isActive: boolean;
}

export interface ISubscriptionManagementEventPayload {
  event: SubscriptionManagementEvent;
  subscriptionId: string;
  scopeKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
