export enum PlanType {
  FREE = 'FREE',
  TRIAL = 'TRIAL',
  PAID = 'PAID',
  CUSTOM = 'CUSTOM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum PlanBillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum PlanOverageRule {
  BLOCK = 'BLOCK',
  ALLOW_OVERAGE = 'ALLOW_OVERAGE',
  THROTTLE = 'THROTTLE',
  NOTIFY_ONLY = 'NOTIFY_ONLY',
}

export enum PlanChangeType {
  CREATED = 'CREATED',
  VERSION_CREATED = 'VERSION_CREATED',
  UPDATED = 'UPDATED',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
  ENTITLEMENT_CHANGED = 'ENTITLEMENT_CHANGED',
}

export enum PlanTransitionDirection {
  UPGRADE = 'UPGRADE',
  DOWNGRADE = 'DOWNGRADE',
  LATERAL = 'LATERAL',
}

export enum PlanManagementEvent {
  PLAN_CREATED = 'plan-management.plan_created',
  PLAN_VERSIONED = 'plan-management.plan_versioned',
  PLAN_PUBLISHED = 'plan-management.plan_published',
  PLAN_DEPRECATED = 'plan-management.plan_deprecated',
  PLAN_ARCHIVED = 'plan-management.plan_archived',
  PLAN_RESTORED = 'plan-management.plan_restored',
  ENTITLEMENT_CHANGED = 'plan-management.entitlement_changed',
}

/** Declarative only — no pricing/tax/currency rules interpreted here; consumed by the (separate, not-yet-built) Billing Engine. */
export interface IPlanPrice {
  currency: string;
  billingCycle: PlanBillingCycle;
  amount: number;
}

/** Declarative feature/capability/resource inclusion — no Feature Flag evaluation engine here. */
export interface IPlanEntitlement {
  module: string;
  feature: string;
  capability?: string;
  resource?: string;
  included: boolean;
  value?: unknown;
}

/** Declarative resource ceilings — no Usage/Quota enforcement engine here; `resourceKey` is an open vocabulary (e.g. USERS, WORKSPACES, MARKETPLACES, SUPPLIERS, WAREHOUSES, AI_USAGE, API_CALLS, STORAGE_GB, REPORTS, AUTOMATIONS), never enum-constrained so new resource types never require a schema change. */
export interface IPlanLimit {
  resourceKey: string;
  unit?: string;
  soft?: number;
  hard?: number;
  graceThreshold?: number;
  overageRule?: PlanOverageRule;
}

export interface IPlanDependencies {
  requiresPlanCodes?: string[];
  incompatibleWithPlanCodes?: string[];
}

export interface IBlockedPlanTransition {
  toCode: string;
  reason: string;
}

export interface IPlanMigrationRules {
  allowedDirectUpgradeCodes?: string[];
  allowedDirectDowngradeCodes?: string[];
  blockedTransitions?: IBlockedPlanTransition[];
}

export interface IPlan {
  id: string;
  code: string;
  version: number;
  name: string;
  description: string | null;
  tier: string;
  tierRank: number;
  type: PlanType;
  status: PlanStatus;
  supportedBillingCycles: PlanBillingCycle[];
  customBillingCycleDays: number | null;
  prices: IPlanPrice[];
  availableCountries: string[];
  availableRegions: string[];
  entitlements: IPlanEntitlement[];
  limits: IPlanLimit[];
  dependencies: IPlanDependencies | null;
  migrationRules: IPlanMigrationRules | null;
  effectiveAt: Date;
  publishedAt: Date | null;
  deprecatedAt: Date | null;
  archivedAt: Date | null;
  isSystem: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanHistory {
  id: string;
  planId: string;
  code: string;
  version: number;
  changeType: PlanChangeType;
  fromStatus: PlanStatus | null;
  toStatus: PlanStatus;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Normalized, lookup-friendly entitlement/limit metadata exposed to Subscription, Usage, Quota, Billing, License and Feature Flag modules. */
export interface IPlanEntitlementSnapshot {
  code: string;
  version: number;
  status: PlanStatus;
  type: PlanType;
  tier: string;
  tierRank: number;
  effectiveAt: Date;
  prices: IPlanPrice[];
  availableCountries: string[];
  availableRegions: string[];
  entitlements: IPlanEntitlement[];
  limits: IPlanLimit[];
  entitlementsByKey: Record<string, IPlanEntitlement>;
  limitsByKey: Record<string, IPlanLimit>;
}

export interface IPlanCompatibilityResult {
  compatible: boolean;
  direction: PlanTransitionDirection;
  reason?: string;
}

export interface IPlanManagementEventPayload {
  event: PlanManagementEvent;
  planId: string;
  code: string;
  version: number;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
