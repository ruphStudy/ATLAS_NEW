import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleExecutionStatus } from '../interfaces';

export class RuleExecutionFilterDto {
  @IsString()
  @IsOptional()
  ruleId?: string;

  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(RuleExecutionStatus)
  @IsOptional()
  status?: RuleExecutionStatus;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

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
