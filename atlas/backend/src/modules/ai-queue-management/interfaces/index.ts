export enum AiQueueStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DRAINING = 'DRAINING',
  STOPPED = 'STOPPED',
}

export enum AiQueueJobStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DELAYED = 'DELAYED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  STUCK = 'STUCK',
}

export enum AiQueueJobPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

export enum AiQueueRoutingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  WEIGHTED = 'WEIGHTED',
  PRIORITY = 'PRIORITY',
  LEAST_LOAD = 'LEAST_LOAD',
  MODEL_BASED = 'MODEL_BASED',
  CAPABILITY_BASED = 'CAPABILITY_BASED',
}

export enum AiQueueEvent {
  QUEUE_CREATED = 'ai-queue.created',
  QUEUE_UPDATED = 'ai-queue.updated',
  QUEUE_PAUSED = 'ai-queue.paused',
  QUEUE_RESUMED = 'ai-queue.resumed',
  QUEUE_DRAINED = 'ai-queue.drained',
  QUEUE_STOPPED = 'ai-queue.stopped',
  JOB_ENQUEUED = 'ai-queue.job_enqueued',
  JOB_STARTED = 'ai-queue.job_started',
  JOB_PROGRESS = 'ai-queue.job_progress',
  JOB_COMPLETED = 'ai-queue.job_completed',
  JOB_FAILED = 'ai-queue.job_failed',
  JOB_RETRYING = 'ai-queue.job_retrying',
  JOB_CANCELLED = 'ai-queue.job_cancelled',
  JOB_DEAD_LETTER = 'ai-queue.job_dead_letter',
  BATCH_STARTED = 'ai-queue.batch_started',
  BATCH_COMPLETED = 'ai-queue.batch_completed',
  METRICS_UPDATED = 'ai-queue.metrics_updated',
}

export interface IAiQueue {
  id: string;
  workspaceId?: string | null;
  name: string;
  displayName: string;
  description?: string | null;
  status: AiQueueStatus;
  routingStrategy: AiQueueRoutingStrategy;
  routingConfig?: unknown | null;
  concurrency: number;
  rateLimit?: number | null;
  rateLimitWindow?: number | null;
  batchSize?: number | null;
  batchWindow?: number | null;
  defaultPriority: AiQueueJobPriority;
  defaultTimeout?: number | null;
  defaultRetries: number;
  retryBackoff?: unknown | null;
  enableDeadLetter: boolean;
  deadLetterThreshold: number;
  enableIdempotency: boolean;
  idempotencyTtl?: number | null;
  enableMetrics: boolean;
  metricsRetention?: number | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiQueueJob {
  id: string;
  queueId: string;
  workspaceId: string;
  jobType: string;
  priority: AiQueueJobPriority;
  status: AiQueueJobStatus;
  jobData: unknown;
  jobOptions?: unknown | null;
  idempotencyKey?: string | null;
  scheduledFor?: Date | null;
  attemptNumber: number;
  maxRetries: number;
  timeout?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  result?: unknown | null;
  error?: unknown | null;
  processingTime?: number | null;
  progress?: number | null;
  progressMessage?: string | null;
  workflowExecutionId?: string | null;
  agentExecutionId?: string | null;
  jobExecutionId?: string | null;
  parentJobId?: string | null;
  batchId?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  capability?: string | null;
  cost?: number | null;
  tokens?: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiQueueMetrics {
  id: string;
  queueId: string;
  workspaceId?: string | null;
  timestamp: Date;
  waitingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  delayedJobs: number;
  totalProcessed: number;
  totalFailed: number;
  avgProcessingTime?: number | null;
  maxProcessingTime?: number | null;
  minProcessingTime?: number | null;
  throughput?: number | null;
  errorRate?: number | null;
  totalCost?: number | null;
  totalTokens?: number | null;
  metadata: unknown;
}

export interface IAiQueueFailure {
  id: string;
  queueJobId: string;
  queueId: string;
  workspaceId: string;
  attemptNumber: number;
  errorCode?: string | null;
  errorMessage: string;
  errorStack?: string | null;
  failedAt: Date;
  retryScheduledFor?: Date | null;
  movedToDeadLetter: boolean;
  deadLetterReason?: string | null;
  metadata: unknown;
}

export interface IQueueEventPayload {
  event: AiQueueEvent;
  workspaceId?: string;
  queueId: string;
  queueJobId?: string;
  batchId?: string;
  status?: string;
  progress?: number;
  metadata?: unknown;
}

export interface IEnqueueJobResult {
  jobId: string;
  queueId: string;
  status: AiQueueJobStatus;
  priority: AiQueueJobPriority;
  position?: number;
  estimatedStartTime?: Date;
}

export interface IJobProcessingResult {
  jobId: string;
  status: AiQueueJobStatus;
  result?: unknown;
  error?: unknown;
  processingTime: number;
  cost?: number;
  tokens?: number;
}

export interface IQueueStatsResult {
  queueId: string;
  status: AiQueueStatus;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  totalProcessed: number;
  totalFailed: number;
  avgProcessingTime?: number;
  throughput?: number;
  errorRate?: number;
  totalCost?: number;
  totalTokens?: number;
}

export interface IBatchJobOptions {
  batchId?: string;
  batchSize?: number;
  jobs: Array<{
    jobType: string;
    jobData: unknown;
    priority?: AiQueueJobPriority;
    scheduledFor?: Date;
  }>;
}

export interface IRetryBackoffConfig {
  type: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
}

export interface IRateLimitConfig {
  max: number;
  duration: number;
  groupKey?: string;
}

export interface IRoutingConfig {
  weights?: Record<string, number>;
  modelPriority?: string[];
  capabilityMapping?: Record<string, string[]>;
}
