import {
  AiQueueStatus,
  AiQueueJobStatus,
  AiQueueJobPriority,
  AiQueueRoutingStrategy,
} from '../interfaces';

export class AiQueueResponseDto {
  id!: string;
  workspaceId?: string | null;
  name!: string;
  displayName!: string;
  description?: string | null;
  status!: AiQueueStatus;
  routingStrategy!: AiQueueRoutingStrategy;
  routingConfig?: unknown | null;
  concurrency!: number;
  rateLimit?: number | null;
  rateLimitWindow?: number | null;
  batchSize?: number | null;
  batchWindow?: number | null;
  defaultPriority!: AiQueueJobPriority;
  defaultTimeout?: number | null;
  defaultRetries!: number;
  retryBackoff?: unknown | null;
  enableDeadLetter!: boolean;
  deadLetterThreshold!: number;
  enableIdempotency!: boolean;
  idempotencyTtl?: number | null;
  enableMetrics!: boolean;
  metricsRetention?: number | null;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedAiQueueResponseDto {
  data!: AiQueueResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class QueueJobResponseDto {
  id!: string;
  queueId!: string;
  workspaceId!: string;
  jobType!: string;
  priority!: AiQueueJobPriority;
  status!: AiQueueJobStatus;
  jobData: unknown;
  jobOptions?: unknown | null;
  idempotencyKey?: string | null;
  scheduledFor?: Date | null;
  attemptNumber!: number;
  maxRetries!: number;
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
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedQueueJobResponseDto {
  data!: QueueJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class EnqueueResultDto {
  jobId!: string;
  queueId!: string;
  status!: AiQueueJobStatus;
  priority!: AiQueueJobPriority;
  position?: number;
  estimatedStartTime?: Date;
}

export class QueueStatsDto {
  queueId!: string;
  status!: AiQueueStatus;
  waiting!: number;
  active!: number;
  completed!: number;
  failed!: number;
  delayed!: number;
  totalProcessed!: number;
  totalFailed!: number;
  avgProcessingTime?: number;
  throughput?: number;
  errorRate?: number;
  totalCost?: number;
  totalTokens?: number;
}
