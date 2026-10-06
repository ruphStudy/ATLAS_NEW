import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AiRetryStatus,
  AiFailureType,
  AiBackoffStrategy,
} from '../interfaces';

export class RetryPolicyResponseDto {
  id!: string;
  workspaceId?: string | null;
  name!: string;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  maxRetries!: number;
  initialDelayMs!: number;
  maxDelayMs!: number;
  backoffMultiplier!: number;
  backoffStrategy!: AiBackoffStrategy;
  jitterFactor!: number;
  timeoutMs?: number | null;
  retryableFailures!: string[];
  nonRetryableFailures!: string[];
  enableFallback!: boolean;
  fallbackPriority!: number;
  respectBudget!: boolean;
  respectQuota!: boolean;
  respectCircuitBreaker!: boolean;
  enabled!: boolean;
  priority!: number;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}

export class RetryExecutionResponseDto {
  id!: string;
  workspaceId!: string;
  status!: AiRetryStatus;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  capability!: string;
  useCase?: string | null;
  originalProvider!: string;
  originalModel!: string;
  policyId?: string | null;
  currentAttempt!: number;
  maxAttempts!: number;
  @ApiPropertyOptional({ enum: AiFailureType, nullable: true })
  lastFailureType?: AiFailureType | null;
  lastFailureMessage?: string | null;
  lastFailureCode?: string | null;
  finalProvider?: string | null;
  finalModel?: string | null;
  finalResponse?: unknown | null;
  totalTokensUsed!: number;
  totalCost!: number;
  idempotencyKey?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  totalDuration?: number | null;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedRetryExecutionResponseDto {
  data!: RetryExecutionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class RetryResultDto {
  executionId!: string;
  status!: AiRetryStatus;
  succeeded!: boolean;
  attempts!: number;
  finalProvider?: string;
  finalModel?: string;
  response?: unknown;
  totalTokensUsed!: number;
  totalCost!: number;
  totalDuration?: number;
  errors!: RetryErrorDto[];
}

export class RetryErrorDto {
  attemptNumber!: number;
  provider!: string;
  model!: string;
  failureType!: AiFailureType;
  failureMessage!: string;
  failureCode?: string;
}

export class FallbackConfigResponseDto {
  id!: string;
  workspaceId?: string | null;
  name!: string;
  capability!: string;
  useCase?: string | null;
  sourceProvider?: string | null;
  sourceModel?: string | null;
  fallbackProvider!: string;
  fallbackModel!: string;
  priority!: number;
  enabled!: boolean;
  triggerFailureTypes!: string[];
  costThreshold?: number | null;
  latencyThreshold?: number | null;
  requireHealthCheck!: boolean;
  requireBudget!: boolean;
  region?: string | null;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}
