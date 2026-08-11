import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleScope, RuleStatus, RuleTriggerType } from '../interfaces';
import { RULE_SORT_FIELDS } from '../constants';

export class RuleFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(RuleScope)
  @IsOptional()
  scope?: RuleScope;

  @IsEnum(RuleStatus)
  @IsOptional()
  status?: RuleStatus;

  @IsEnum(RuleTriggerType)
  @IsOptional()
  triggerType?: RuleTriggerType;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(RULE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof RULE_SORT_FIELDS)[number];

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
