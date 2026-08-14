import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DrExecutionStatus, DrExecutionTrigger } from '../interfaces';

export class TriggerDrRecoveryDto {
  @IsBoolean()
  @IsOptional()
  isDryRun?: boolean;

  /** Required for PARTIAL/TENANT-scoped plans — the strict tenant-isolation boundary for this run. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetWorkspaceIds?: string[];

  @IsEnum(DrExecutionTrigger)
  @IsOptional()
  triggerType?: DrExecutionTrigger;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class DetectDrDisasterDto {
  @IsString()
  @IsNotEmpty()
  criticalService: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  environment?: string;
}

export class DrExecutionFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  planId?: string;

  @IsEnum(DrExecutionStatus)
  @IsOptional()
  status?: DrExecutionStatus;
}
