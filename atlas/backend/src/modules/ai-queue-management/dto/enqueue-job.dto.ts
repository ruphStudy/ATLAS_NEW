import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';
import { AiQueueJobPriority } from '../interfaces';

export class EnqueueJobDto {
  @IsString()
  @IsNotEmpty()
  queueName!: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  jobType!: string;

  @IsObject()
  @IsNotEmpty()
  jobData: unknown;

  @IsEnum(AiQueueJobPriority)
  @IsOptional()
  priority?: AiQueueJobPriority;

  @IsObject()
  @IsOptional()
  jobOptions?: unknown;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxRetries?: number;

  @IsInt()
  @IsOptional()
  @Min(1000)
  timeout?: number;

  @IsString()
  @IsOptional()
  modelProvider?: string;

  @IsString()
  @IsOptional()
  modelName?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
