import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingRuleScope, ProrationStrategy } from '../interfaces';
import { OverageRateDto } from './overage-rate.dto';

export class CreateBillingRuleDto {
  @IsEnum(BillingRuleScope)
  scope!: BillingRuleScope;

  /** Required for TENANT scope when not the caller's own workspace context — otherwise resolved from the caller. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  planKey?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRatePercent?: number;

  @IsEnum(ProrationStrategy)
  @IsOptional()
  prorationStrategy?: ProrationStrategy;

  @IsInt()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverageRateDto)
  @IsOptional()
  overageRates?: OverageRateDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
