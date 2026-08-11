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
import { AiUsageRecordStatus, AiUsageSource } from '../interfaces';

export class RecordAiUsageDto {
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
  reasoningTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  cachedTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  imageUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  embeddingUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  audioUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  toolCalls?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  requestCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  retryCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  fallbackCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  latencyMs?: number;

  @IsEnum(AiUsageRecordStatus)
  @IsOptional()
  status?: AiUsageRecordStatus;

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

  @IsEnum(AiUsageSource)
  @IsOptional()
  source?: AiUsageSource;

  @IsString()
  @IsOptional()
  providerRequestRef?: string;

  @IsString()
  @IsOptional()
  providerResponseRef?: string;

  @IsString()
  @IsOptional()
  providerBillingRef?: string;

  @IsString()
  @IsOptional()
  costRecordId?: string;

  @IsString()
  @IsOptional()
  errorCode?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
