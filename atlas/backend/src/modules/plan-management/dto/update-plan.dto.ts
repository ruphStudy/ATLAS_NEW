import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PlanBillingCycle } from '../interfaces';
import { PlanPriceDto } from './plan-price.dto';
import { PlanEntitlementDto } from './plan-entitlement.dto';
import { PlanLimitDto } from './plan-limit.dto';
import { PlanDependenciesDto, PlanMigrationRulesDto } from './plan-constraints.dto';

/** Only ever applied to a DRAFT version — publishing freezes a row; any change to a PUBLISHED plan must go through `createNewVersion`. */
export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  tier?: string;

  @IsInt()
  @IsOptional()
  tierRank?: number;

  @IsArray()
  @IsOptional()
  supportedBillingCycles?: PlanBillingCycle[];

  @IsInt()
  @IsOptional()
  @Min(1)
  customBillingCycleDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanPriceDto)
  @IsOptional()
  prices?: PlanPriceDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableCountries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableRegions?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanEntitlementDto)
  @IsOptional()
  entitlements?: PlanEntitlementDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanLimitDto)
  @IsOptional()
  limits?: PlanLimitDto[];

  @ValidateNested()
  @Type(() => PlanDependenciesDto)
  @IsOptional()
  dependencies?: PlanDependenciesDto;

  @ValidateNested()
  @Type(() => PlanMigrationRulesDto)
  @IsOptional()
  migrationRules?: PlanMigrationRulesDto;

  @IsString()
  @IsNotEmpty()
  changeReason: string;
}
