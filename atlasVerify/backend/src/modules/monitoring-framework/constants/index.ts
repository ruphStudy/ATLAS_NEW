import { MonitoringSloStatus } from '../interfaces';

export const MONITORING_FRAMEWORK_MODULE = 'monitoring-framework';
export const SYSTEM_ACTOR_ID = 'system';

export const MONITORING_FRAMEWORK_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  /** Cap on rows/sources scanned per alert-evaluation tick — mirrors the bounded-scan pattern used across this codebase's scheduler-callable methods. */
  SCAN_LIMIT: 500,

  /** Minimum distinct sources reporting DEGRADED/UNHEALTHY at once, for the same workspace, to be treated as a cascading failure rather than isolated incidents. */
  CASCADING_FAILURE_SOURCE_THRESHOLD: 3,

  ALLOWED_SLO_TRANSITIONS: {
    [MonitoringSloStatus.DRAFT]: [MonitoringSloStatus.ACTIVE, MonitoringSloStatus.ARCHIVED],
    [MonitoringSloStatus.ACTIVE]: [MonitoringSloStatus.PAUSED, MonitoringSloStatus.ARCHIVED],
    [MonitoringSloStatus.PAUSED]: [MonitoringSloStatus.ACTIVE, MonitoringSloStatus.ARCHIVED],
    [MonitoringSloStatus.ARCHIVED]: [MonitoringSloStatus.DRAFT],
  } as Record<MonitoringSloStatus, MonitoringSloStatus[]>,

  SLO_SORT_FIELDS: ['createdAt', 'updatedAt', 'service'] as const,
  ALERT_RULE_SORT_FIELDS: ['createdAt', 'updatedAt', 'sourceKey'] as const,
  INCIDENT_SORT_FIELDS: ['openedAt', 'createdAt', 'severity'] as const,

  /** Built-in source keys this module ships adapters for — matches the "SaaS Monitoring, SaaS Health, Analytics Health, Operations Health, AI Monitoring, Marketplace Health, Backup/Disaster Recovery" scope list exactly. */
  BUILT_IN_SOURCE_KEYS: [
    'SAAS_HEALTH',
    'OPERATIONS_HEALTH',
    'AI_MONITORING_HEALTH',
    'ANALYTICS_HEALTH',
    'MARKETPLACE_HEALTH',
    'DISASTER_RECOVERY',
    'BACKUP_MANAGEMENT',
  ],
} as const;
