import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import {
  AiQueueStatus,
  AiQueueJobPriority,
  AiQueueRoutingStrategy,
} from '../interfaces';

export class CreateAiQueueDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AiQueueRoutingStrategy)
  @IsOptional()
  routingStrategy?: AiQueueRoutingStrategy;

  @IsObject()
  @IsOptional()
  routingConfig?: unknown;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  concurrency?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  rateLimit?: number;

  @IsInt()
  @IsOptional()
  @Min(1000)
  rateLimitWindow?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  batchSize?: number;

  @IsInt()
  @IsOptional()
  @Min(100)
  batchWindow?: number;

  @IsEnum(AiQueueJobPriority)
  @IsOptional()
  defaultPriority?: AiQueueJobPriority;

  @IsInt()
  @IsOptional()
  @Min(1000)
  defaultTimeout?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10)
  defaultRetries?: number;

  @IsObject()
  @IsOptional()
  retryBackoff?: unknown;

  @IsBoolean()
  @IsOptional()
  enableDeadLetter?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  deadLetterThreshold?: number;

  @IsBoolean()
  @IsOptional()
  enableIdempotency?: boolean;

  @IsInt()
  @IsOptional()
  idempotencyTtl?: number;

  @IsBoolean()
  @IsOptional()
  enableMetrics?: boolean;

  @IsInt()
  @IsOptional()
  metricsRetention?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
