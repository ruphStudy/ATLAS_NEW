export enum SyncModule {
  CATALOG = 'CATALOG',
  INVENTORY = 'INVENTORY',
  LISTING = 'LISTING',
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  RETURN = 'RETURN',
  PRICING = 'PRICING',
  REPORT = 'REPORT',
}

export enum SyncStatus {
  IDLE = 'IDLE',
  SCHEDULED = 'SCHEDULED',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  STUCK = 'STUCK',
  DELAYED = 'DELAYED',
}

export enum SyncIssueType {
  STUCK = 'STUCK',
  DELAYED = 'DELAYED',
  REPEATEDLY_FAILING = 'REPEATEDLY_FAILING',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  RATE_LIMITED = 'RATE_LIMITED',
  QUEUE_BACKED_UP = 'QUEUE_BACKED_UP',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  MISSING_SCHEDULE = 'MISSING_SCHEDULE',
}

export enum SyncMonitorEvent {
  SYNC_STARTED = 'sync.started',
  SYNC_PROGRESS = 'sync.progress',
  SYNC_COMPLETED = 'sync.completed',
  SYNC_FAILED = 'sync.failed',
  SYNC_CANCELLED = 'sync.cancelled',
  SYNC_RETRIED = 'sync.retried',
  SYNC_RESUMED = 'sync.resumed',
  ISSUE_DETECTED = 'issue.detected',
  ISSUE_RESOLVED = 'issue.resolved',
  ALERT_TRIGGERED = 'alert.triggered',
  QUEUE_HEALTH_CHANGED = 'queue_health.changed',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface ISyncSnapshot {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  status: SyncStatus;
  jobId?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsTotal?: number;
  itemsFailed: number;
  successRate: number;
  throughput?: number;
  currentPage?: number;
  nextCursor?: string;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: Date;
  consecutiveFailures: number;
  lastSuccessfulSyncAt?: Date;
  nextScheduledSyncAt?: Date;
}

export interface ISyncIssue {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  type: SyncIssueType;
  severity: AlertSeverity;
  message: string;
  detectedAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface IQueueHealth {
  queueName: string;
  workspaceId: string;
  module: SyncModule;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  isPaused: boolean;
  isHealthy: boolean;
  avgProcessingTime?: number;
  throughput?: number;
  errorRate?: number;
  lastJobAt?: Date;
}

export interface IRateLimitStatus {
  workspaceId: string;
  provider: string;
  accountId?: string;
  module: SyncModule;
  isLimited: boolean;
  limitResetAt?: Date;
  requestsRemaining?: number;
  requestsLimit?: number;
  retryAfter?: number;
}

export interface ISyncHistory {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsTotal?: number;
  itemsFailed: number;
  successRate: number;
  errorSummary?: string;
  triggeredBy?: string;
}

export interface IItemLevelFailure {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  itemId: string;
  externalId?: string;
  errorCode?: string;
  errorMessage: string;
  failedAt: Date;
  retryCount: number;
  isResolved: boolean;
}

export interface ISyncMonitorEvent {
  eventType: SyncMonitorEvent;
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId?: string;
  status?: SyncStatus;
  issueType?: SyncIssueType;
  severity?: AlertSeverity;
  message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SyncAggregateData {
  snapshot: ISyncSnapshot;
  queueHealth?: IQueueHealth;
  rateLimitStatus?: IRateLimitStatus;
  recentHistory: ISyncHistory[];
  activeIssues: ISyncIssue[];
}

export interface SyncDetectionResult {
  issues: ISyncIssue[];
  alerts: ISyncMonitorEvent[];
}

export interface NormalizedErrorSummary {
  errorCode?: string;
  errorMessage: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedItems: string[];
  isRecoverable: boolean;
  suggestedAction?: string;
}

export interface SyncRetryOptions {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId?: string;
  resumeFromCursor?: boolean;
  resetErrors?: boolean;
}

export interface SyncCancellationOptions {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  reason?: string;
  graceful?: boolean;
}
