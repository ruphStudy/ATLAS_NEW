import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { BackupJobStatus } from '../interfaces';

export class TriggerBackupDto {
  /** Required for TENANT-scoped policies — the strict tenant-isolation boundary for this run. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targetWorkspaceIds?: string[];

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class BackupEventTriggerDto {
  @IsString()
  policyId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class BackupJobFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  policyId?: string;

  @IsEnum(BackupJobStatus)
  @IsOptional()
  status?: BackupJobStatus;
}

export class BackupRecordFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  policyId?: string;

  @IsString()
  @IsOptional()
  targetType?: string;
}
