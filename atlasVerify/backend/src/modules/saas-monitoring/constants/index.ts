import { QUEUE_NAMES } from '@common/constants';
import { SaasHealthModuleKey } from '../interfaces';

export const SAAS_MONITORING_MODULE = 'saas-monitoring';

/** The role used for this module's own internal, non-interactive reads against Audit Logs (health computation is not a user-initiated request) — mirrors Operations Health's own internal role. */
export const SAAS_MONITORING_INTERNAL_ROLE = 'OWNER';

/** Maps each monitored SaaS module to its already-registered BullMQ queue name — the primary signal source (job counts, pause state, oldest waiting job). */
export const MONITORED_MODULE_QUEUE_MAP: Record<SaasHealthModuleKey, string> = {
  [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT]: QUEUE_NAMES.SUBSCRIPTION_MANAGEMENT_EVENTS,
  [SaasHealthModuleKey.BILLING_ENGINE]: QUEUE_NAMES.BILLING_ENGINE_EVENTS,
  [SaasHealthModuleKey.PAYMENT_PROVIDER]: QUEUE_NAMES.PAYMENT_PROVIDER_EVENTS,
  [SaasHealthModuleKey.USAGE_TRACKING]: QUEUE_NAMES.USAGE_TRACKING_EVENTS,
  [SaasHealthModuleKey.QUOTA_MANAGEMENT]: QUEUE_NAMES.QUOTA_MANAGEMENT_EVENTS,
  [SaasHealthModuleKey.FEATURE_FLAGS]: QUEUE_NAMES.FEATURE_FLAGS_EVENTS,
  [SaasHealthModuleKey.LICENSE_MANAGEMENT]: QUEUE_NAMES.LICENSE_MANAGEMENT_EVENTS,
  [SaasHealthModuleKey.API_KEY_MANAGEMENT]: QUEUE_NAMES.API_KEY_MANAGEMENT_EVENTS,
  [SaasHealthModuleKey.OAUTH_MANAGEMENT]: QUEUE_NAMES.OAUTH_MANAGEMENT_EVENTS,
  [SaasHealthModuleKey.SSO_FRAMEWORK]: QUEUE_NAMES.SSO_FRAMEWORK_EVENTS,
  [SaasHealthModuleKey.WEBHOOK_FRAMEWORK]: QUEUE_NAMES.WEBHOOK_FRAMEWORK_EVENTS,
  [SaasHealthModuleKey.APP_STORE]: QUEUE_NAMES.APP_STORE_EVENTS,
  [SaasHealthModuleKey.PLUGIN_FRAMEWORK]: QUEUE_NAMES.PLUGIN_FRAMEWORK_EVENTS,
  [SaasHealthModuleKey.SAAS_ADMINISTRATION]: QUEUE_NAMES.SAAS_ADMINISTRATION_EVENTS,
  [SaasHealthModuleKey.SAAS_AUDIT]: QUEUE_NAMES.SAAS_AUDIT_EVENTS,
};

/** The `RecordAuditLogDto.module` value each monitored module records its own audit entries under — used to cross-check failure rate via Audit Logs' existing `findAll()`. */
export const MONITORED_MODULE_AUDIT_MODULE_MAP: Record<SaasHealthModuleKey, string> = {
  [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT]: 'subscription-management',
  [SaasHealthModuleKey.BILLING_ENGINE]: 'billing-engine',
  [SaasHealthModuleKey.PAYMENT_PROVIDER]: 'payment-provider',
  [SaasHealthModuleKey.USAGE_TRACKING]: 'usage-tracking',
  [SaasHealthModuleKey.QUOTA_MANAGEMENT]: 'quota-management',
  [SaasHealthModuleKey.FEATURE_FLAGS]: 'feature-flags',
  [SaasHealthModuleKey.LICENSE_MANAGEMENT]: 'license-management',
  [SaasHealthModuleKey.API_KEY_MANAGEMENT]: 'api-key-management',
  [SaasHealthModuleKey.OAUTH_MANAGEMENT]: 'oauth-management',
  [SaasHealthModuleKey.SSO_FRAMEWORK]: 'sso-framework',
  [SaasHealthModuleKey.WEBHOOK_FRAMEWORK]: 'webhook-framework',
  [SaasHealthModuleKey.APP_STORE]: 'app-store',
  [SaasHealthModuleKey.PLUGIN_FRAMEWORK]: 'plugin-framework',
  [SaasHealthModuleKey.SAAS_ADMINISTRATION]: 'saas-administration',
  [SaasHealthModuleKey.SAAS_AUDIT]: 'saas-audit',
};

// ── Configurable thresholds — registered as Settings Framework definitions in onModuleInit; these are only the in-code fallback defaults. ──

export const SAAS_MONITORING_BACKLOG_WARNING_SETTING = 'saas-monitoring.backlog-warning-threshold';
export const SAAS_MONITORING_BACKLOG_CRITICAL_SETTING = 'saas-monitoring.backlog-critical-threshold';
export const SAAS_MONITORING_FAILED_WARNING_SETTING = 'saas-monitoring.failed-warning-threshold';
export const SAAS_MONITORING_FAILED_CRITICAL_SETTING = 'saas-monitoring.failed-critical-threshold';
export const SAAS_MONITORING_AUDIT_FAILURE_WARNING_SETTING = 'saas-monitoring.audit-failure-warning-threshold';
export const SAAS_MONITORING_AUDIT_FAILURE_CRITICAL_SETTING = 'saas-monitoring.audit-failure-critical-threshold';
export const SAAS_MONITORING_STALE_CHECK_WARNING_MINUTES_SETTING = 'saas-monitoring.stale-check-warning-minutes';

export const DEFAULT_THRESHOLDS: {
  backlogWarning: number;
  backlogCritical: number;
  failedWarning: number;
  failedCritical: number;
  auditFailureWarning: number;
  auditFailureCritical: number;
  staleCheckWarningMinutes: number;
} = {
  backlogWarning: 50,
  backlogCritical: 200,
  failedWarning: 5,
  failedCritical: 20,
  auditFailureWarning: 5,
  auditFailureCritical: 20,
  staleCheckWarningMinutes: 60,
};

/** The window looked back when counting recent audit-log FAILURE entries for a module. */
export const AUDIT_FAILURE_WINDOW_MINUTES = 60;

/** A waiting job older than this is tagged DELAYED. */
export const DELAYED_JOB_AGE_WARNING_MS = 5 * 60 * 1000;

/** Consecutive non-HEALTHY checks before a module is additionally tagged REPEATEDLY_FAILING. */
export const REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD = 3;
