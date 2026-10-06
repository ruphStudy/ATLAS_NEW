import {
  IsString,
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
import { ComplianceAction } from '../interfaces';

export class UpdateComplianceRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsEnum(ComplianceAction, { each: true })
  @ArrayMaxSize(20)
  @IsOptional()
  actions?: ComplianceAction[];

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

  @IsString()
  @IsOptional()
  changeReason?: string;
}
