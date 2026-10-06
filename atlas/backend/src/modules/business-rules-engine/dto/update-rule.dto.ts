import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsInt, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleConditionGroupDto } from './rule-condition.dto';
import { RuleActionDto } from './rule-action.dto';

export class UpdateRuleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  triggerRef?: string;

  @ValidateNested()
  @Type(() => RuleConditionGroupDto)
  @IsOptional()
  conditions?: RuleConditionGroupDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  @IsOptional()
  actions?: RuleActionDto[];

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsInt()
  @IsOptional()
  executionOrder?: number;

  @IsBoolean()
  @IsOptional()
  stopOnMatch?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  scheduleIntervalMinutes?: number;

  @IsString()
  @IsNotEmpty()
  changeReason!: string;
}
