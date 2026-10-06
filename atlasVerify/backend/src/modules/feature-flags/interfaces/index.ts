export enum FeatureFlagType {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  ALLOWLIST = 'ALLOWLIST',
  DENYLIST = 'DENYLIST',
  RULE_BASED = 'RULE_BASED',
}

export enum FeatureFlagScopeType {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  PLAN = 'PLAN',
  USER = 'USER',
  ENVIRONMENT = 'ENVIRONMENT',
}

export enum FeatureFlagDefinitionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum FeatureFlagOverrideStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum FeatureFlagHistoryEntityType {
  DEFINITION = 'DEFINITION',
  OVERRIDE = 'OVERRIDE',
}

export enum FeatureFlagChangeType {
  DEFINITION_CREATED = 'DEFINITION_CREATED',
  DEFINITION_UPDATED = 'DEFINITION_UPDATED',
  DEFINITION_ENABLED = 'DEFINITION_ENABLED',
  DEFINITION_DISABLED = 'DEFINITION_DISABLED',
  DEFINITION_ARCHIVED = 'DEFINITION_ARCHIVED',
  DEFINITION_RESTORED = 'DEFINITION_RESTORED',
  KILL_SWITCH_ACTIVATED = 'KILL_SWITCH_ACTIVATED',
  KILL_SWITCH_DEACTIVATED = 'KILL_SWITCH_DEACTIVATED',
  OVERRIDE_CREATED = 'OVERRIDE_CREATED',
  OVERRIDE_UPDATED = 'OVERRIDE_UPDATED',
  OVERRIDE_ENABLED = 'OVERRIDE_ENABLED',
  OVERRIDE_DISABLED = 'OVERRIDE_DISABLED',
  OVERRIDE_ARCHIVED = 'OVERRIDE_ARCHIVED',
}

export enum FeatureFlagEvent {
  DEFINITION_CREATED = 'feature-flags.definition_created',
  DEFINITION_UPDATED = 'feature-flags.definition_updated',
  DEFINITION_ENABLED = 'feature-flags.definition_enabled',
  DEFINITION_DISABLED = 'feature-flags.definition_disabled',
  DEFINITION_ARCHIVED = 'feature-flags.definition_archived',
  DEFINITION_RESTORED = 'feature-flags.definition_restored',
  KILL_SWITCH_ACTIVATED = 'feature-flags.kill_switch_activated',
  KILL_SWITCH_DEACTIVATED = 'feature-flags.kill_switch_deactivated',
  OVERRIDE_CREATED = 'feature-flags.override_created',
  OVERRIDE_UPDATED = 'feature-flags.override_updated',
  OVERRIDE_ENABLED = 'feature-flags.override_enabled',
  OVERRIDE_DISABLED = 'feature-flags.override_disabled',
  OVERRIDE_ARCHIVED = 'feature-flags.override_archived',
  FLAG_EVALUATED = 'feature-flags.flag_evaluated',
}

export interface IFeatureFlagDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FeatureFlagType;
  status: FeatureFlagDefinitionStatus;
  defaultEnabled: boolean;
  rolloutPercentage: number | null;
  startDate: Date | null;
  endDate: Date | null;
  dependencies: string[];
  mutuallyExclusiveWith: string[];
  priority: number;
  killSwitchEnabled: boolean;
  killSwitchReason: string | null;
  owner: string | null;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeatureFlagTargetingRules {
  allowlist?: string[];
  denylist?: string[];
  planKeys?: string[];
  minTierRank?: number;
  roles?: string[];
  countries?: string[];
  regions?: string[];
  marketplaces?: string[];
  providers?: string[];
  environments?: string[];
}

export interface IFeatureFlagOverride {
  id: string;
  flagKey: string;
  scope: FeatureFlagScopeType;
  scopeKey: string;
  workspaceId: string | null;
  organizationId: string | null;
  status: FeatureFlagOverrideStatus;
  enabled: boolean;
  rolloutPercentage: number | null;
  rules: IFeatureFlagTargetingRules | null;
  startDate: Date | null;
  endDate: Date | null;
  version: number;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeatureFlagHistory {
  id: string;
  entityType: FeatureFlagHistoryEntityType;
  entityId: string;
  flagKey: string;
  workspaceId: string | null;
  changeType: FeatureFlagChangeType;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Caller-supplied — there is no built-in lookup for a workspace's country/region/marketplace anywhere in ATLAS, so evaluation context is always provided explicitly, the same way `ISettingsResolutionContext` works. */
export interface IFeatureFlagEvaluationContext {
  workspaceId?: string;
  organizationId?: string;
  userId?: string;
  userRole?: string;
  environment?: string;
  country?: string;
  region?: string;
  marketplace?: string;
  provider?: string;
}

export interface IFeatureFlagEvaluationResult {
  key: string;
  enabled: boolean;
  source: FeatureFlagScopeType | 'DEFAULT' | 'KILL_SWITCH' | 'DEPENDENCY' | 'MUTUAL_EXCLUSION' | 'INACTIVE' | 'SCHEDULE';
  reason?: string;
}

export interface IFeatureFlagEventPayload {
  event: FeatureFlagEvent;
  flagKey: string;
  entityId?: string;
  workspaceId?: string | null;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
