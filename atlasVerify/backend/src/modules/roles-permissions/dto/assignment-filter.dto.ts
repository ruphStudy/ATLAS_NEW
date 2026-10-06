import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PrincipalType, AssignmentStatus, AssignmentScopeType } from '../interfaces';
import { ASSIGNMENT_SORT_FIELDS } from '../constants';

export class AssignmentFilterDto {
  @IsString()
  @IsOptional()
  roleId?: string;

  @IsEnum(PrincipalType)
  @IsOptional()
  principalType?: PrincipalType;

  @IsString()
  @IsOptional()
  principalId?: string;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

  @IsEnum(AssignmentScopeType)
  @IsOptional()
  scopeType?: AssignmentScopeType;

  @IsIn(ASSIGNMENT_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof ASSIGNMENT_SORT_FIELDS)[number];

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
