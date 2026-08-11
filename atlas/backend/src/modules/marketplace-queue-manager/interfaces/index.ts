export enum QueueType {
  CATALOG_SYNC = 'CATALOG_SYNC',
  INVENTORY_SYNC = 'INVENTORY_SYNC',
  LISTING_SYNC = 'LISTING_SYNC',
  ORDER_SYNC = 'ORDER_SYNC',
  SHIPMENT_SYNC = 'SHIPMENT_SYNC',
  RETURN_SYNC = 'RETURN_SYNC',
  PRICING_SYNC = 'PRICING_SYNC',
  REPORT_SYNC = 'REPORT_SYNC',
  WEBHOOK_PROCESSING = 'WEBHOOK_PROCESSING',
  EVENT_PROCESSING = 'EVENT_PROCESSING',
}

export enum JobState {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  STALE = 'STALE',
}

export enum JobPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 2,
  CRITICAL = 1,
}

export enum QueueStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DRAINING = 'DRAINING',
  SHUTDOWN = 'SHUTDOWN',
  ERROR = 'ERROR',
}

export enum QueueLifecycleEvent {
  QUEUE_CREATED = 'queue.created',
  QUEUE_REGISTERED = 'queue.registered',
  QUEUE_PAUSED = 'queue.paused',
  QUEUE_RESUMED = 'queue.resumed',
  QUEUE_DRAINED = 'queue.drained',
  QUEUE_SHUTDOWN = 'queue.shutdown',
  JOB_ADDED = 'job.added',
  JOB_STARTED = 'job.started',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_CANCELLED = 'job.cancelled',
  JOB_RETRIED = 'job.retried',
  JOB_STALE = 'job.stale',
  JOB_DUPLICATE_PREVENTED = 'job.duplicate_prevented',
  RATE_LIMIT_TRIGGERED = 'rate_limit.triggered',
  ALERT_TRIGGERED = 'alert.triggered',
}

export enum BackoffStrategy {
  FIXED = 'FIXED',
  EXPONENTIAL = 'EXPONENTIAL',
  LINEAR = 'LINEAR',
}

export interface IJobOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: BackoffStrategy;
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  timeout?: number;
  idempotencyKey?: string;
  jobId?: string;
}

export interface IJobPayload {
  workspaceId: string;
  provider: string;
  accountId?: string;
  type: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IJobInfo {
  id: string;
  queueName: string;
  queueType: QueueType;
  workspaceId: string;
  provider: string;
  accountId?: string;
  state: JobState;
  priority: number;
  attempts: number;
  maxAttempts: number;
  progress?: number;
  data: IJobPayload;
  failedReason?: string;
  stacktrace?: string[];
  addedAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  delay?: number;
  timestamp: Date;
}

export interface IQueueConfig {
  queueName: string;
  queueType: QueueType;
  concurrency?: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
  defaultJobOptions?: IJobOptions;
  enableMetrics?: boolean;
  enableDeadLetter?: boolean;
}

export interface IQueueMetrics {
  queueName: string;
  queueType: QueueType;
  status: QueueStatus;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
  isPaused: boolean;
  concurrency?: number;
  throughput?: number;
  avgProcessingTime?: number;
  avgWaitTime?: number;
  errorRate?: number;
  lastJobAt?: Date;
  healthScore: number;
}

export interface IQueueHealth {
  queueName: string;
  isHealthy: boolean;
  status: QueueStatus;
  issues: string[];
  metrics: IQueueMetrics;
  checkedAt: Date;
}

export interface IRateLimitConfig {
  workspaceId: string;
  provider: string;
  accountId?: string;
  queueType: QueueType;
  maxConcurrent: number;
  maxPerMinute: number;
  maxPerHour: number;
  isEnabled: boolean;
}

export interface IJobRetryOptions {
  workspaceId: string;
  queueType: QueueType;
  jobId: string;
  resetAttempts?: boolean;
  priority?: JobPriority;
}

export interface IJobCancellationOptions {
  workspaceId: string;
  queueType: QueueType;
  jobId: string;
  reason?: string;
  removeFromQueue?: boolean;
}

export interface IBulkJobRequest {
  workspaceId: string;
  provider: string;
  accountId?: string;
  queueType: QueueType;
  jobs: Array<{
    type: string;
    data: Record<string, any>;
    options?: IJobOptions;
  }>;
}

export interface IQueueLifecycleEvent {
  eventType: QueueLifecycleEvent;
  queueName: string;
  queueType: QueueType;
  workspaceId?: string;
  provider?: string;
  accountId?: string;
  jobId?: string;
  message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IDeadLetterJob {
  id: string;
  queueName: string;
  queueType: QueueType;
  workspaceId: string;
  provider: string;
  accountId?: string;
  originalJobId: string;
  payload: IJobPayload;
  failedReason: string;
  failedAt: Date;
  attempts: number;
  isReprocessed: boolean;
  reprocessedAt?: Date;
}

export interface IJobHistory {
  jobId: string;
  queueName: string;
  queueType: QueueType;
  workspaceId: string;
  state: JobState;
  event: string;
  message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface IStaleJobCriteria {
  queueType: QueueType;
  workspaceId?: string;
  olderThanMinutes: number;
}

export interface QueueOperationResult {
  success: boolean;
  message: string;
  queueName?: string;
  jobId?: string;
  jobIds?: string[];
  metadata?: Record<string, any>;
}

export interface ErrorSummary {
  errorType: string;
  errorMessage: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedJobs: string[];
  isRecoverable: boolean;
}

export interface ScheduledJobConfig {
  workspaceId: string;
  provider: string;
  accountId?: string;
  queueType: QueueType;
  jobType: string;
  data: Record<string, any>;
  cronExpression: string;
  timezone?: string;
  enabled: boolean;
}
