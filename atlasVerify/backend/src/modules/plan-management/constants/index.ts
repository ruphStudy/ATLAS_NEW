import { PlanStatus } from '../interfaces';

export const PLAN_MANAGEMENT_MODULE = 'plan-management';

export const PLAN_ALLOWED_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  [PlanStatus.DRAFT]: [PlanStatus.PUBLISHED, PlanStatus.ARCHIVED],
  [PlanStatus.PUBLISHED]: [PlanStatus.DEPRECATED, PlanStatus.ARCHIVED],
  [PlanStatus.DEPRECATED]: [PlanStatus.PUBLISHED, PlanStatus.ARCHIVED],
  [PlanStatus.ARCHIVED]: [PlanStatus.DRAFT],
};

export const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

export const PLAN_SORT_FIELDS = ['createdAt', 'updatedAt', 'tierRank', 'name'] as const;

/**
 * Suggested, non-exhaustive vocabulary for `IPlanLimit.resourceKey` — purely
 * documentation/autocomplete guidance. The field itself is an open string,
 * never enum-constrained, so a new resource type never needs a schema or
 * code change here.
 */
export const SUGGESTED_PLAN_LIMIT_RESOURCE_KEYS: string[] = [
  'USERS',
  'WORKSPACES',
  'MARKETPLACES',
  'SUPPLIERS',
  'WAREHOUSES',
  'AI_USAGE',
  'API_CALLS',
  'STORAGE_GB',
  'REPORTS',
  'AUTOMATIONS',
];

/** Registered via the Settings Framework in `PlanManagementService.onModuleInit` — never a hardcoded default plan. */
export const DEFAULT_PLAN_CODE_SETTING = 'plan-management.default-plan-code';

/** Plans are a platform-wide catalog, not tenant data — this sentinel is used only as the required `workspaceId` slot on the shared Audit Logs schema, never as a real tenant. */
export const PLATFORM_AUDIT_WORKSPACE_ID = 'platform';
