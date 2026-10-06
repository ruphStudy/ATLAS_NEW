import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RuleConditionOperator, RuleLogicOperator } from '../interfaces';

export class RuleConditionDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsEnum(RuleConditionOperator)
  operator: RuleConditionOperator;

  @IsOptional()
  value?: unknown;
}

export class RuleConditionGroupDto {
  @IsEnum(RuleLogicOperator)
  logic: RuleLogicOperator;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  @IsOptional()
  conditions?: RuleConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionGroupDto)
  @IsOptional()
  groups?: RuleConditionGroupDto[];
}
