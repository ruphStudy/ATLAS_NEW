import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
  IsArray,
  Min,
  IsDateString,
} from 'class-validator';
import { AiJobType, AiJobTaskType, AiJobPriority, AiJobStatus } from '../interfaces';

export class UpdateAiJobDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AiJobType)
  @IsOptional()
  type?: AiJobType;

  @IsEnum(AiJobTaskType)
  @IsOptional()
  taskType?: AiJobTaskType;

  @IsEnum(AiJobPriority)
  @IsOptional()
  priority?: AiJobPriority;

  @IsEnum(AiJobStatus)
  @IsOptional()
  status?: AiJobStatus;

  @IsObject()
  @IsOptional()
  taskConfig?: unknown;

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
}
