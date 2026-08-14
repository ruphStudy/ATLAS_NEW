import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ComplianceRecordStatus, ComplianceSubjectType } from '../interfaces';
import { COMPLIANCE_RECORD_SORT_FIELDS } from '../constants';

export class ComplianceRecordFilterDto {
  @IsString()
  @IsOptional()
  ruleId?: string;

  @IsString()
  @IsOptional()
  ruleKey?: string;

  @IsEnum(ComplianceSubjectType)
  @IsOptional()
  subjectType?: ComplianceSubjectType;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsEnum(ComplianceRecordStatus)
  @IsOptional()
  status?: ComplianceRecordStatus;

  @IsIn(COMPLIANCE_RECORD_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof COMPLIANCE_RECORD_SORT_FIELDS)[number];

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
