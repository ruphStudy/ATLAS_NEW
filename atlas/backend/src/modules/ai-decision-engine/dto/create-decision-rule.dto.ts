import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateDecisionRuleDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  decisionType!: string;

  @IsString()
  @IsNotEmpty()
  method!: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsObject()
  @IsNotEmpty()
  ruleConfig: unknown;

  @IsObject()
  @IsOptional()
  weights?: unknown;

  @IsObject()
  @IsOptional()
  thresholds?: unknown;

  @IsInt()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsNumber()
  @IsOptional()
  approvalThreshold?: number;

  @IsString()
  @IsOptional()
  version?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
