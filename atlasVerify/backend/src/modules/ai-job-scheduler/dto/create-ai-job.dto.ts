import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
  IsArray,
  Min,
  IsDateString,
} from 'class-validator';
import { AiJobType, AiJobTaskType, AiJobPriority } from '../interfaces';

export class CreateAiJobDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AiJobType)
  type: AiJobType;

  @IsEnum(AiJobTaskType)
  taskType: AiJobTaskType;

  @IsEnum(AiJobPriority)
  @IsOptional()
  priority?: AiJobPriority;

  @IsObject()
  @IsNotEmpty()
  taskConfig: unknown;

  @IsObject()
  @IsOptional()
  scheduleConfig?: unknown;

  @IsInt()
  @IsOptional()
  @Min(1000)
  timeout?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxRetries?: number;

  @IsObject()
  @IsOptional()
  retryBackoff?: unknown;

  @IsInt()
  @IsOptional()
  @Min(1)
  concurrencyLimit?: number;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsDateString()
  @IsOptional()
  startAfter?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
