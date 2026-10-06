export enum QuotaScopeType {
  GLOBAL = 'GLOBAL',
  PLAN = 'PLAN',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  USER = 'USER',
}

export enum QuotaResetSchedule {
  BILLING_CYCLE = 'BILLING_CYCLE',
  CALENDAR_DAILY = 'CALENDAR_DAILY',
  CALENDAR_WEEKLY = 'CALENDAR_WEEKLY',
  CALENDAR_MONTHLY = 'CALENDAR_MONTHLY',
  CUSTOM = 'CUSTOM',
  NEVER = 'NEVER',
}

export enum QuotaPolicyStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuotaOverrideStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum QuotaEnforcementState {
  OK = 'OK',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
  BLOCKED = 'BLOCKED',
}

export enum QuotaHistoryEntityType {
  POLICY = 'POLICY',
  OVERRIDE = 'OVERRIDE',
  STATE = 'STATE',
}

export enum QuotaChangeType {
  POLICY_CREATED = 'POLICY_CREATED',
  POLICY_UPDATED = 'POLICY_UPDATED',
  POLICY_ENABLED = 'POLICY_ENABLED',
  POLICY_DISABLED = 'POLICY_DISABLED',
  POLICY_ARCHIVED = 'POLICY_ARCHIVED',
  OVERRIDE_CREATED = 'OVERRIDE_CREATED',
  OVERRIDE_REVOKED = 'OVERRIDE_REVOKED',
  OVERRIDE_EXPIRED = 'OVERRIDE_EXPIRED',
  QUOTA_RESET = 'QUOTA_RESET',
  STATE_WARNING = 'STATE_WARNING',
  STATE_EXCEEDED = 'STATE_EXCEEDED',
  STATE_BLOCKED = 'STATE_BLOCKED',
  STATE_RESTORED = 'STATE_RESTORED',
}

export enum QuotaManagementEvent {
  POLICY_CREATED = 'quota-management.policy_created',
  POLICY_UPDATED = 'quota-management.policy_updated',
  POLICY_ENABLED = 'quota-management.policy_enabled',
  POLICY_DISABLED = 'quota-management.policy_disabled',
  POLICY_ARCHIVED = 'quota-management.policy_archived',
  OVERRIDE_CREATED = 'quota-management.override_created',
  OVERRIDE_REVOKED = 'quota-management.override_revoked',
  OVERRIDE_EXPIRED = 'quota-management.override_expired',
  QUOTA_RESET = 'quota-management.quota_reset',
  QUOTA_WARNING = 'quota-management.quota_warning',
  QUOTA_EXCEEDED = 'quota-management.quota_exceeded',
  QUOTA_BLOCKED = 'quota-management.quota_blocked',
  QUOTA_RESTORED = 'quota-management.quota_restored',
}

export interface IQuotaPolicy {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: QuotaScopeType;
  scopeKey: string;
  resourceKey: string;
  feature: string;
  planKey: string | null;
  unit: string | null;
  softLimit: number | null;
  hardLimit: number | null;
  graceThreshold: number | null;
  overageAllowed: boolean;
  overageLimit: number | null;
  resetSchedule: QuotaResetSchedule;
  customResetIntervalDays: number | null;
  status: QuotaPolicyStatus;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuotaOverride {
  id: string;
  policyId: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeKey: string;
  resourceKey: string;
  feature: string;
  additionalHardLimit: number | null;
  reason: string;
  status: QuotaOverrideStatus;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuotaState {
  id: string;
  policyId: string | null;
  workspaceId: string | null;
  organizationId: string | null;
  scopeKey: string;
  resourceKey: string;
  feature: string;
  state: QuotaEnforcementState;
  consumedAtLastCheck: number;
  limitAtLastCheck: number | null;
  lastEvaluatedAt: Date;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  lastResetAt: Date | null;
  nextResetAt: Date | null;
  blockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuotaHistory {
  id: string;
  entityType: QuotaHistoryEntityType;
  entityId: string;
  workspaceId: string | null;
  resourceKey: string;
  changeType: QuotaChangeType;
  fromValue: unknown;
  toValue: unknown;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Caller-supplied evaluation identity — resourceKey/feature is an open vocabulary matching Plan Management's/Usage Tracking's, never enum-constrained. */
export interface IQuotaCheckRequest {
  workspaceId: string;
  organizationId?: string;
  userId?: string;
  resourceKey: string;
  feature?: string;
  requestedQuantity?: number;
}

export interface IQuotaCheckResult {
  allowed: boolean;
  state: QuotaEnforcementState;
  resourceKey: string;
  feature: string;
  consumed: number;
  limit: number | null;
  remaining: number | null;
  overage: number;
  reason?: string;
}

export interface IQuotaManagementEventPayload {
  event: QuotaManagementEvent;
  entityId: string;
  resourceKey: string;
  workspaceId?: string | null;
  scopeKey?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
