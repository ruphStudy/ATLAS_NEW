import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsBoolean,
  IsInt,
  Min,
  IsDateString,
  ArrayMaxSize,
} from 'class-validator';
import { ComplianceAction, ComplianceRequirementType } from '../interfaces';

export class CreateComplianceRuleDto {
  /** Omit for a global default rule that applies across every workspace. */
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ComplianceRequirementType)
  requirementType: ComplianceRequirementType;

  @IsArray()
  @IsEnum(ComplianceAction, { each: true })
  @ArrayMaxSize(20)
  actions: ComplianceAction[];

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsString()
  @IsOptional()
  productCategory?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsBoolean()
  @IsOptional()
  mandatory?: boolean;

  @IsObject()
  @IsOptional()
  thresholds?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  exemptionCodes?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  renewalPeriodDays?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reminderDaysBeforeExpiry?: number;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
