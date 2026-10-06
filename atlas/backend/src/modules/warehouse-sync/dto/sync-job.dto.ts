import { IsString, IsOptional, IsEnum } from 'class-validator';
import { WarehouseSyncType, WarehouseSyncConflictStrategy } from '../interfaces';

export class TriggerSyncJobDto {
  @IsString()
  configurationId!: string;

  @IsEnum(WarehouseSyncType)
  @IsOptional()
  syncType?: WarehouseSyncType;

  @IsOptional()
  @IsString()
  triggeredBy?: string;
}

export class PauseSyncJobDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  pausedBy?: string;
}

export class ResumeSyncJobDto {
  @IsOptional()
  @IsString()
  resumedBy?: string;
}

export class CancelSyncJobDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;
}

export class ResolveConflictDto {
  @IsString()
  conflictId!: string;

  @IsEnum(WarehouseSyncConflictStrategy)
  @IsOptional()
  resolutionStrategy?: WarehouseSyncConflictStrategy;

  @IsOptional()
  @IsString()
  resolutionAction?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsString()
  resolvedBy?: string;
}
