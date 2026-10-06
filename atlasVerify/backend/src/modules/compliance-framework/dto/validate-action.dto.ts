import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ArrayMaxSize } from 'class-validator';
import { ComplianceAction, ComplianceSubjectType } from '../interfaces';

export class ValidateComplianceDto {
  @IsEnum(ComplianceAction)
  action: ComplianceAction;

  @IsEnum(ComplianceSubjectType)
  subjectType: ComplianceSubjectType;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

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

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  exemptionCodes?: string[];
}
