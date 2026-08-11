import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { AiCostRecordStatus } from '../interfaces';

export class RecordAiCostDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  providerKey: string;

  @IsString()
  @IsOptional()
  modelKey?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  feature?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  orchestratorRequestId?: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  agentExecutionId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  workflowExecutionId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  jobExecutionId?: string;

  @IsString()
  @IsOptional()
  queueJobId?: string;

  // ── Estimated usage (optional; defaults to the final usage below when omitted) ──
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedInputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedOutputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedCachedTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedImageUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedEmbeddingUnits?: number;

  // ── Final/actual usage ────────────────────────────────────────────
  @IsInt()
  @Min(0)
  @IsOptional()
  inputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  outputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  cachedTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  imageUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  embeddingUnits?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  requestCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  latencyMs?: number;

  @IsEnum(AiCostRecordStatus)
  @IsOptional()
  status?: AiCostRecordStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  attemptNumber?: number;

  @IsBoolean()
  @IsOptional()
  isRetry?: boolean;

  @IsBoolean()
  @IsOptional()
  isFallback?: boolean;

  @IsBoolean()
  @IsOptional()
  isDuplicate?: boolean;

  @IsString()
  @IsOptional()
  providerUsageRef?: string;

  @IsString()
  @IsOptional()
  providerBillingRef?: string;

  @IsString()
  @IsOptional()
  errorCode?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
