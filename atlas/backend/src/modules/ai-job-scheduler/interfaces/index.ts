export enum AiJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  RETRYING = 'RETRYING',
  TIMEOUT = 'TIMEOUT',
}

export enum AiJobType {
  ONE_TIME = 'ONE_TIME',
  RECURRING = 'RECURRING',
  CRON = 'CRON',
  DELAYED = 'DELAYED',
  EVENT_TRIGGERED = 'EVENT_TRIGGERED',
}

export enum AiJobTaskType {
  WORKFLOW = 'WORKFLOW',
  AGENT = 'AGENT',
  BUSINESS_TASK = 'BUSINESS_TASK',
}

export enum AiJobPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AiJobEvent {
  JOB_CREATED = 'ai-job.created',
  JOB_UPDATED = 'ai-job.updated',
  JOB_SCHEDULED = 'ai-job.scheduled',
  JOB_QUEUED = 'ai-job.queued',
  JOB_STARTED = 'ai-job.started',
  JOB_PROGRESS = 'ai-job.progress',
  JOB_COMPLETED = 'ai-job.completed',
  JOB_FAILED = 'ai-job.failed',
  JOB_CANCELLED = 'ai-job.cancelled',
  JOB_PAUSED = 'ai-job.paused',
  JOB_RESUMED = 'ai-job.resumed',
  JOB_RETRYING = 'ai-job.retrying',
  JOB_TIMEOUT = 'ai-job.timeout',
  JOB_ARCHIVED = 'ai-job.archived',
}

export interface IAiJob {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string | null;
  type: AiJobType;
  taskType: AiJobTaskType;
  priority: AiJobPriority;
  status: AiJobStatus;
  taskConfig: unknown;
  scheduleConfig?: unknown | null;
  timeout?: number | null;
  maxRetries: number;
  retryBackoff?: unknown | null;
  concurrencyLimit?: number | null;
  idempotencyKey?: string | null;
  startAfter?: Date | null;
  lastExecutedAt?: Date | null;
  nextExecutionAt?: Date | null;
  executionCount: number;
  successCount: number;
  failureCount: number;
  tags: string[];
  metadata: unknown;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiJobExecution {
  id: string;
  jobId: string;
  workspaceId: string;
  status: AiJobStatus;
  attemptNumber: number;
  input?: unknown | null;
  output?: unknown | null;
  progress?: number | null;
  progressMessage?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  workflowExecutionId?: string | null;
  agentExecutionId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  cost?: number | null;
  tokens?: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiJobLog {
  id: string;
  executionId: string;
  workspaceId: string;
  level: string;
  message: string;
  context?: unknown | null;
  timestamp: Date;
}

export interface IAiJobDependency {
  id: string;
  jobId: string;
  dependsOnJobId: string;
  workspaceId: string;
  type: string;
  config?: unknown | null;
  createdAt: Date;
}

export interface IJobEventPayload {
  event: AiJobEvent;
  workspaceId: string;
  jobId: string;
  executionId?: string;
  status?: string;
  progress?: number;
  metadata?: unknown;
}

export interface IJobExecutionResult {
  executionId: string;
  status: AiJobStatus;
  output?: unknown;
  cost?: number;
  tokens?: number;
  duration?: number;
  metadata?: unknown;
}

export interface ITaskConfig {
  workflowId?: string;
  agentId?: string;
  taskName?: string;
  input?: unknown;
  context?: unknown;
}

export interface IScheduleConfig {
  cronExpression?: string;
  interval?: number;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  maxExecutions?: number;
}

export interface IRetryBackoff {
  type: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
}
