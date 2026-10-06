import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalWorkflowStatus } from '../interfaces';
import { APPROVAL_DEFINITION_SORT_FIELDS } from '../constants';

export class WorkflowDefinitionFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(ApprovalWorkflowStatus)
  @IsOptional()
  status?: ApprovalWorkflowStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(APPROVAL_DEFINITION_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof APPROVAL_DEFINITION_SORT_FIELDS)[number];

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
