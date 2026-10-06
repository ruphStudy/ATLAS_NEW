import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RuleScope, RuleTriggerType } from '../interfaces';
import { RuleConditionGroupDto } from './rule-condition.dto';
import { RuleActionDto } from './rule-action.dto';

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase, hyphen-separated identifier (e.g. "high-value-order-approval")',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RuleScope)
  @IsOptional()
  scope?: RuleScope;

  /** Required when scope is ORGANIZATION. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(RuleTriggerType)
  triggerType!: RuleTriggerType;

  /** Event name (EVENT), workflow key (WORKFLOW), or omitted (API/SCHEDULE). */
  @IsString()
  @IsOptional()
  triggerRef?: string;

  @ValidateNested()
  @Type(() => RuleConditionGroupDto)
  conditions!: RuleConditionGroupDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions!: RuleActionDto[];

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsInt()
  @IsOptional()
  executionOrder?: number;

  @IsBoolean()
  @IsOptional()
  stopOnMatch?: boolean;

  /** Only meaningful when triggerType is SCHEDULE — dormant until a scheduler is wired; process via the manual trigger endpoint. */
  @IsNumber()
  @IsOptional()
  @Min(1)
  scheduleIntervalMinutes?: number;
}
