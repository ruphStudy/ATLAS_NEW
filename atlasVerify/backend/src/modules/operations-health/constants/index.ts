import { QUEUE_NAMES } from '@common/constants';
import { OperationsHealthModuleKey } from '../interfaces';

export const OPERATIONS_HEALTH_MODULE = 'operations-health';

/** Roles permitted to view health snapshots/incidents/check history — mirrors Audit Logs' own view roles. */
export const OPERATIONS_HEALTH_VIEW_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

/** The role used for this module's own internal, non-interactive reads against Audit Logs (health computation is not a user-initiated request). */
export const OPERATIONS_HEALTH_INTERNAL_ROLE = 'OWNER';

/** Maps each monitored Sprint 9 module to its already-registered BullMQ queue name — the primary signal source (job counts, pause state, oldest waiting job). */
export const MONITORED_MODULE_QUEUE_MAP: Record<OperationsHealthModuleKey, string> = {
  [OperationsHealthModuleKey.NOTIFICATIONS]: QUEUE_NAMES.NOTIFICATION_EVENTS,
  [OperationsHealthModuleKey.FILE_MANAGEMENT]: QUEUE_NAMES.FILE_EVENTS,
  [OperationsHealthModuleKey.DOCUMENT_MANAGEMENT]: QUEUE_NAMES.DOCUMENT_EVENTS,
  [OperationsHealthModuleKey.APPROVAL_WORKFLOW]: QUEUE_NAMES.APPROVAL_WORKFLOW_EVENTS,
  [OperationsHealthModuleKey.TASK_MANAGEMENT]: QUEUE_NAMES.TASK_MANAGEMENT_EVENTS,
  [OperationsHealthModuleKey.SEARCH_FRAMEWORK]: QUEUE_NAMES.SEARCH_FRAMEWORK_EVENTS,
  [OperationsHealthModuleKey.BUSINESS_RULES_ENGINE]: QUEUE_NAMES.BUSINESS_RULES_ENGINE_EVENTS,
  [OperationsHealthModuleKey.SETTINGS]: QUEUE_NAMES.SETTINGS_EVENTS,
};

/** The `RecordAuditLogDto.module` value each monitored module records its own audit entries under — used to cross-check failure rate via Audit Logs' existing `findAll()`. */
export const MONITORED_MODULE_AUDIT_MODULE_MAP: Record<OperationsHealthModuleKey, string> = {
  [OperationsHealthModuleKey.NOTIFICATIONS]: 'notifications',
  [OperationsHealthModuleKey.FILE_MANAGEMENT]: 'file-management',
  [OperationsHealthModuleKey.DOCUMENT_MANAGEMENT]: 'document-management',
  [OperationsHealthModuleKey.APPROVAL_WORKFLOW]: 'approval-workflow',
  [OperationsHealthModuleKey.TASK_MANAGEMENT]: 'task-management',
  [OperationsHealthModuleKey.SEARCH_FRAMEWORK]: 'search-framework',
  [OperationsHealthModuleKey.BUSINESS_RULES_ENGINE]: 'business-rules-engine',
  [OperationsHealthModuleKey.SETTINGS]: 'settings',
};

// ── Configurable thresholds — registered as Settings Framework definitions in onModuleInit; these are only the in-code fallback defaults. ──

export const OPERATIONS_HEALTH_BACKLOG_WARNING_SETTING = 'operations-health.backlog-warning-threshold';
export const OPERATIONS_HEALTH_BACKLOG_CRITICAL_SETTING = 'operations-health.backlog-critical-threshold';
export const OPERATIONS_HEALTH_FAILED_WARNING_SETTING = 'operations-health.failed-warning-threshold';
export const OPERATIONS_HEALTH_FAILED_CRITICAL_SETTING = 'operations-health.failed-critical-threshold';
export const OPERATIONS_HEALTH_AUDIT_FAILURE_WARNING_SETTING = 'operations-health.audit-failure-warning-threshold';
export const OPERATIONS_HEALTH_AUDIT_FAILURE_CRITICAL_SETTING = 'operations-health.audit-failure-critical-threshold';
export const OPERATIONS_HEALTH_STALE_CHECK_WARNING_MINUTES_SETTING = 'operations-health.stale-check-warning-minutes';

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
