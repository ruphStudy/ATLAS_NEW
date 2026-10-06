import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DrPlanStatus, DrRecoveryScope } from '../interfaces';

export class CreateDrRecoveryPlanDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  policyId?: string;

  @IsEnum(DrRecoveryScope)
  scope!: DrRecoveryScope;

  @IsArray()
  @IsString({ each: true })
  targets!: string[];

  /** Explicit runbook — `IWorkflowStageDefinition[]` passed straight through to `EnterpriseWorkflowEngineService.createDefinition`. When omitted, a default BACKUP_DISCOVERY → VALIDATE_BACKUP → RESTORE_TARGET → HEALTH_CHECK sequence is generated per target. */
  @IsArray()
  @IsOptional()
  stages?: unknown[];

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsString()
  @IsOptional()
  approvalDefinitionKey?: string;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @IsBoolean()
  @IsOptional()
  dryRunDefault?: boolean;

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

export class UpdateDrRecoveryPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  targets?: string[];

  @IsArray()
  @IsOptional()
  stages?: unknown[];

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsString()
  @IsOptional()
  approvalDefinitionKey?: string;

  @IsBoolean()
  @IsOptional()
  dryRunDefault?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}

export class DrRecoveryPlanFilterDto extends PaginationDto {
  @IsString()
  @IsOptional()
  policyId?: string;

  @IsEnum(DrRecoveryScope)
  @IsOptional()
  scope?: DrRecoveryScope;

  @IsEnum(DrPlanStatus)
  @IsOptional()
  status?: DrPlanStatus;

  @IsString()
  @IsOptional()
  search?: string;
}
