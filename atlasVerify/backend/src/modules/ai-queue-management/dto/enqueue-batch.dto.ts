import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EnqueueJobDto } from './enqueue-job.dto';

class BatchJobItem {
  @IsString()
  @IsNotEmpty()
  jobType: string;

  @IsNotEmpty()
  jobData: unknown;

  @IsOptional()
  priority?: string;

  @IsOptional()
  scheduledFor?: string;
}

export class EnqueueBatchDto {
  @IsString()
  @IsNotEmpty()
  queueName: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchJobItem)
  jobs: BatchJobItem[];
}
