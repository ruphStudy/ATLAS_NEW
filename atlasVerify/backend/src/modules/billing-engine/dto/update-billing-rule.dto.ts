import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProrationStrategy } from '../interfaces';
import { OverageRateDto } from './overage-rate.dto';

export class UpdateBillingRuleDto {
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
