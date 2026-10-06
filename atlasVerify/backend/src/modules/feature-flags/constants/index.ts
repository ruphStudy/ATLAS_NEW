import { FeatureFlagScopeType } from '../interfaces';

export const FEATURE_FLAGS_MODULE = 'feature-flags';

/** Roles permitted to manage flag definitions/overrides. */
export const FEATURE_FLAG_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

export const FEATURE_FLAG_CACHE_TTL_MS = 60 * 1000;

/** Lowest → highest specificity — the same "candidates ranked by `indexOf`, highest rank wins" idiom `SettingsService.resolve()` uses. */
export const FEATURE_FLAG_SCOPE_PRECEDENCE: FeatureFlagScopeType[] = [
  FeatureFlagScopeType.GLOBAL,
  FeatureFlagScopeType.ORGANIZATION,
  FeatureFlagScopeType.PLAN,
  FeatureFlagScopeType.ENVIRONMENT,
  FeatureFlagScopeType.WORKSPACE,
  FeatureFlagScopeType.USER,
];

export const FEATURE_FLAG_DEFINITION_SORT_FIELDS = ['createdAt', 'updatedAt', 'key', 'name'] as const;
export const FEATURE_FLAG_OVERRIDE_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;

/** Guard against pathological/malformed dependency graphs while walking for cycle detection. */
export const MAX_DEPENDENCY_GRAPH_DEPTH = 32;
