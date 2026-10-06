import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class UpdateOrganizationPolicyDto {
  @IsNumber()
  @IsOptional()
  approvalThreshold?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  approverRoles?: string[];

  @IsBoolean()
  @IsOptional()
  autoReorderEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  lowStockThresholdPercent?: number;

  @IsBoolean()
  @IsOptional()
  autoPublishEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  minMarginPercent?: number;

  @IsBoolean()
  @IsOptional()
  mfaRequired?: boolean;

  @IsNumber()
  @IsOptional()
  sessionTimeoutMinutes?: number;

  @IsNumber()
  @IsOptional()
  auditLogRetentionDays?: number;

  @IsNumber()
  @IsOptional()
  fileRetentionDays?: number;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
