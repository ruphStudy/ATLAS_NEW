import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { BackupPolicyStatus, BackupScope } from '../interfaces';

export class CreateBackupPolicyDto {
  @IsString()
  environment: string;

  @IsString()
  service: string;

  @IsString()
  dataType: string;

  @IsString()
  backupType: string;

  @IsEnum(BackupScope)
  @IsOptional()
  scope?: BackupScope;

  @IsInt()
  @Min(1)
  @IsOptional()
  frequencyMinutes?: number;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  retentionDays?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxVersions?: number;

  @IsBoolean()
  @IsOptional()
  encryptionEnabled?: boolean;

  @IsString()
  @IsOptional()
  encryptionAlgorithm?: string;

  @IsBoolean()
  @IsOptional()
  compressionEnabled?: boolean;

  @IsString()
  @IsOptional()
  compressionAlgorithm?: string;

  @IsString()
  @IsOptional()
  preferredProviderKey?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateBackupPolicyDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  frequencyMinutes?: number;

  @IsString()
  @IsOptional()
  cronExpression?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  retentionDays?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxVersions?: number;

  @IsBoolean()
  @IsOptional()
  encryptionEnabled?: boolean;

  @IsString()
  @IsOptional()
  encryptionAlgorithm?: string;

  @IsBoolean()
  @IsOptional()
  compressionEnabled?: boolean;

  @IsString()
  @IsOptional()
  compressionAlgorithm?: string;

  @IsString()
  @IsOptional()
  preferredProviderKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class BackupPolicyFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  environment?: string;

  @IsEnum(BackupPolicyStatus)
  @IsOptional()
  status?: BackupPolicyStatus;

  @IsString()
  @IsOptional()
  search?: string;
}
