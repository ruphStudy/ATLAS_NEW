import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiQueueJobStatus, AiQueueJobPriority } from '../interfaces';

export class QueueJobFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  queueId?: string;

  @IsString()
  @IsOptional()
  queueName?: string;

  @IsString()
  @IsOptional()
  jobType?: string;

  @IsEnum(AiQueueJobStatus)
  @IsOptional()
  status?: AiQueueJobStatus;

  @IsEnum(AiQueueJobPriority)
  @IsOptional()
  priority?: AiQueueJobPriority;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  modelProvider?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
