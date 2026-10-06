import { SaasHealthModuleKey } from '@modules/saas-monitoring/interfaces';

export const SAAS_HEALTH_MODULE = 'saas-health';

/** The role used for this module's own internal, non-interactive reads (health evaluation is not a user-initiated request) — mirrors SaaS Monitoring's/Operations Health's own internal role. */
export const SAAS_HEALTH_INTERNAL_ROLE = 'OWNER';

/**
 * Static dependency graph — which monitored modules each module relies on
 * to function, used only to compute cascading impact (an unhealthy
 * dependency degrades confidence in its dependents' own reported status)
 * and never to alter SaaS Monitoring's own per-module snapshot. A plain,
 * hand-maintained map — no separate graph-database/infra needed for a
 * dozen-node DAG.
 */
export const MODULE_DEPENDENCY_GRAPH: Record<SaasHealthModuleKey, SaasHealthModuleKey[]> = {
  [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT]: [],
  [SaasHealthModuleKey.USAGE_TRACKING]: [],
  [SaasHealthModuleKey.OAUTH_MANAGEMENT]: [],
  [SaasHealthModuleKey.SSO_FRAMEWORK]: [],
  [SaasHealthModuleKey.WEBHOOK_FRAMEWORK]: [],
  [SaasHealthModuleKey.SAAS_AUDIT]: [],
  [SaasHealthModuleKey.PAYMENT_PROVIDER]: [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT],
  [SaasHealthModuleKey.BILLING_ENGINE]: [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT, SaasHealthModuleKey.PAYMENT_PROVIDER],
  [SaasHealthModuleKey.QUOTA_MANAGEMENT]: [SaasHealthModuleKey.USAGE_TRACKING],
  [SaasHealthModuleKey.FEATURE_FLAGS]: [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT],
  [SaasHealthModuleKey.LICENSE_MANAGEMENT]: [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT],
  [SaasHealthModuleKey.API_KEY_MANAGEMENT]: [SaasHealthModuleKey.OAUTH_MANAGEMENT],
  [SaasHealthModuleKey.APP_STORE]: [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT, SaasHealthModuleKey.FEATURE_FLAGS],
  [SaasHealthModuleKey.PLUGIN_FRAMEWORK]: [SaasHealthModuleKey.APP_STORE, SaasHealthModuleKey.WEBHOOK_FRAMEWORK],
  [SaasHealthModuleKey.SAAS_ADMINISTRATION]: [
    SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT,
    SaasHealthModuleKey.BILLING_ENGINE,
    SaasHealthModuleKey.QUOTA_MANAGEMENT,
    SaasHealthModuleKey.FEATURE_FLAGS,
    SaasHealthModuleKey.LICENSE_MANAGEMENT,
  ],
};

// ── Configurable weights/thresholds — registered as Settings Framework definitions in onModuleInit; these are only the in-code fallback defaults. ──

export const SAAS_HEALTH_SCORE_MODULE_WEIGHT_SETTING = 'saas-health.score-module-weight';
export const SAAS_HEALTH_SCORE_BUSINESS_WEIGHT_SETTING = 'saas-health.score-business-weight';
export const SAAS_HEALTH_SCORE_CASCADING_PENALTY_SETTING = 'saas-health.score-cascading-penalty';
export const SAAS_HEALTH_DEGRADED_SCORE_THRESHOLD_SETTING = 'saas-health.degraded-score-threshold';
export const SAAS_HEALTH_UNHEALTHY_SCORE_THRESHOLD_SETTING = 'saas-health.unhealthy-score-threshold';

export const DEFAULT_SCORE_CONFIG: {
  /** Weight (0-1) of the infra/module-status-derived score in the final blend. */
  moduleWeight: number;
  /** Weight (0-1) of Tenant Analytics' own business health score in the final blend. `moduleWeight + businessWeight` should equal 1. */
  businessWeight: number;
  /** Points deducted from the module-derived score per distinct cascading impact detected. */
  cascadingPenaltyPerImpact: number;
  /** Composite score at/below which the tenant is considered DEGRADED (absent a worse per-module status). */
  degradedScoreThreshold: number;
  /** Composite score at/below which the tenant is considered UNHEALTHY (absent a worse per-module status). */
  unhealthyScoreThreshold: number;
} = {
  moduleWeight: 0.7,
  businessWeight: 0.3,
  cascadingPenaltyPerImpact: 5,
  degradedScoreThreshold: 80,
  unhealthyScoreThreshold: 50,
};

/** Per-module score contribution by SaaS Monitoring status, before any dependency/business blending. */
export const STATUS_SCORE_MAP: Record<string, number> = {
  HEALTHY: 100,
  DEGRADED: 60,
  UNHEALTHY: 20,
};

/** Consecutive non-HEALTHY evaluations before the aggregate incident's trigger summary notes repeated failure. */
export const REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD = 3;
