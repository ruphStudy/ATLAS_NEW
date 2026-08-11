import { AiJobStatus, AiJobType, AiJobTaskType, AiJobPriority } from '../interfaces';

export class AiJobResponseDto {
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
}

export class PaginatedAiJobResponseDto {
  data: AiJobResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class JobExecutionResponseDto {
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
  cost?: number | null;
  tokens?: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedExecutionResponseDto {
  data: JobExecutionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ExecutionResultDto {
  executionId: string;
  status: AiJobStatus;
  output?: unknown;
  cost?: number;
  tokens?: number;
  duration?: number;
  metadata?: unknown;
}
