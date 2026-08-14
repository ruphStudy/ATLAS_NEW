export const ENTERPRISE_HEALTH_MODULE = 'enterprise-health';
export const SYSTEM_ACTOR_ID = 'system';

/** Permission "resource" names for `PermissionResolverService.hasPermission()` — same style as every other Enterprise-family module's validator. */
export const ENTERPRISE_HEALTH_DASHBOARD_RESOURCE = 'dashboard';
export const ENTERPRISE_HEALTH_INCIDENT_RESOURCE = 'incident';

export const ENTERPRISE_HEALTH_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  /** Minimum distinct regions (or providers) reporting DEGRADED/UNHEALTHY/OFFLINE at once, within the same organization, to be treated as a regional-impact/provider-outage incident rather than isolated per-workspace ones — mirrors Monitoring Framework's `CASCADING_FAILURE_SOURCE_THRESHOLD`. */
  CASCADING_SCOPE_THRESHOLD: 3,

  /** Cap on how many of an organization's workspaces a single dashboard/sweep call will aggregate over — bounds cost; a wider view is just invoked again. */
  MAX_WORKSPACES_PER_SWEEP: 200,

  /**
   * Composite score weights (sum to 1). A scoring *policy*, not
   * provider/infrastructure-specific logic — every input it reads
   * (availability/latency/error-rate/backlog/dependency/security/
   * recovery) already comes from generic, already-aggregated signals.
   */
  SCORE_WEIGHTS: {
    AVAILABILITY: 0.2,
    LATENCY: 0.15,
    FAILURE: 0.15,
    BACKLOG: 0.1,
    DEPENDENCY: 0.15,
    SECURITY: 0.15,
    RECOVERY: 0.1,
  },

  /** Latency curve bounds (ms) — at/below GOOD scores 100, at/above BAD scores 0, linear between. */
  LATENCY_GOOD_MS: 200,
  LATENCY_BAD_MS: 2000,

  /** Error-rate/backlog normalization scale — values at/above this score 0. */
  FAILURE_SCALE: 100,
  BACKLOG_SCALE: 500,

  /** Per-open-security-incident score penalty (Enterprise Audit), heavier for HIGH_RISK. */
  SECURITY_INCIDENT_PENALTY: 15,
  SECURITY_HIGH_RISK_PENALTY: 30,

  /** Per-unhealthy DR/Backup Management signal score penalty for the recovery-readiness dimension. */
  RECOVERY_UNHEALTHY_PENALTY: 50,

  SNAPSHOT_HISTORY_SORT_FIELDS: ['createdAt'] as const,
  INCIDENT_SORT_FIELDS: ['openedAt', 'createdAt', 'severity'] as const,
} as const;
