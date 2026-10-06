import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LicenseScopeType } from '../interfaces';

export class TransferLicenseDto {
  @IsEnum(LicenseScopeType)
  scopeType!: LicenseScopeType;

  /** Target workspace — may differ from the acting admin's own workspace for a genuine cross-tenant transfer. Required for WORKSPACE/USER/ENVIRONMENT/DEPLOYMENT scope. */
  @IsString()
  @IsOptional()
  targetWorkspaceId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  ownerUserId?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsString()
  @IsOptional()
  deploymentId?: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
