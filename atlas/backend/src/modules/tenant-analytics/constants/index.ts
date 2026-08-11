export const TENANT_ANALYTICS_MODULE = 'tenant-analytics';

/** Same acting-role string used by SaaS Administration — every downstream module gates management behind `['OWNER', 'ADMIN']`. Tenant Analytics itself is read-mostly, but the sweep's writes (health snapshots) go through this module's own repository directly, not another module's role-gated service. */
export const ADMIN_ACTING_ROLE = 'ADMIN';

/** Platform-wide aggregates (MRR/ARR/cohort/segmentation) have no single owning tenant, but `AnalyticsCacheService`'s schema requires a `workspaceId` — this sentinel keys those entries consistently. */
export const PLATFORM_CACHE_WORKSPACE_ID = '__PLATFORM__';

export const CACHE_TTL_SECONDS = 3600;

/** Risk-level thresholds against the 0-100 composite health score. */
export const HEALTH_SCORE_AT_RISK_THRESHOLD = 60;
export const HEALTH_SCORE_CRITICAL_THRESHOLD = 35;

/** Component weights for the composite health score — configuration-driven, adjustable without touching the computation logic itself. */
export const HEALTH_SCORE_WEIGHTS = {
  usage: 0.3,
  billing: 0.3,
  activity: 0.25,
  support: 0.15,
} as const;

/** Consecutive-tenant page size used when a computation must walk every tenant (health sweep, revenue rollup) — bounds a single pass without requiring a dedicated "count all" endpoint. */
export const TENANT_SCAN_PAGE_SIZE = 100;

export const EXPORT_FORMATS = ['csv', 'json'] as const;
