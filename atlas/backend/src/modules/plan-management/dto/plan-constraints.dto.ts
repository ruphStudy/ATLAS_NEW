import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PlanDependenciesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiresPlanCodes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  incompatibleWithPlanCodes?: string[];
}

export class BlockedPlanTransitionDto {
  @IsString()
  toCode!: string;

  @IsString()
  reason!: string;
}

export class PlanMigrationRulesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDirectUpgradeCodes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDirectDowngradeCodes?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedPlanTransitionDto)
  @IsOptional()
  blockedTransitions?: BlockedPlanTransitionDto[];
}
