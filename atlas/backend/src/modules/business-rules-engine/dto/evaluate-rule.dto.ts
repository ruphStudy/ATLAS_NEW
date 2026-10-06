import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { RuleTriggerType } from '../interfaces';

export class EvaluateRulesDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsEnum(RuleTriggerType)
  @IsOptional()
  triggerType?: RuleTriggerType;

  @IsString()
  @IsOptional()
  triggerRef?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsObject()
  input!: Record<string, unknown>;

  /** A repeat evaluate() call with the same key against the same rule replays its cached outcome instead of re-executing actions. */
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
