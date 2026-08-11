import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanType, PlanBillingCycle } from '../interfaces';
import { PlanPriceDto } from './plan-price.dto';
import { PlanEntitlementDto } from './plan-entitlement.dto';
import { PlanLimitDto } from './plan-limit.dto';
import { PlanDependenciesDto, PlanMigrationRulesDto } from './plan-constraints.dto';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'code must be a lowercase, hyphen-separated identifier (e.g. "pro-monthly")' })
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  tier: string;

  @IsInt()
  @IsOptional()
  tierRank?: number;

  @IsEnum(PlanType)
  type: PlanType;

  @IsArray()
  @IsEnum(PlanBillingCycle, { each: true })
  supportedBillingCycles: PlanBillingCycle[];

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
}
