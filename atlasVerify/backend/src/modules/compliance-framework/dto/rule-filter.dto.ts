import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ComplianceRequirementType, ComplianceRuleStatus } from '../interfaces';
import { COMPLIANCE_RULE_SORT_FIELDS } from '../constants';

export class ComplianceRuleFilterDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsEnum(ComplianceRequirementType)
  @IsOptional()
  requirementType?: ComplianceRequirementType;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsEnum(ComplianceRuleStatus)
  @IsOptional()
  status?: ComplianceRuleStatus;

  @IsIn(COMPLIANCE_RULE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof COMPLIANCE_RULE_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
