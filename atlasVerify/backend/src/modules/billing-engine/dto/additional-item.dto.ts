import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { BillingItemType } from '../interfaces';

export class AdditionalItemDto {
  @IsEnum(BillingItemType)
  type: BillingItemType;

  @IsString()
  @IsNotEmpty()
  description: string;

  /** Positive for charges, negative for discounts/credits — this module never assumes sign from `type`. */
  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  unitAmount?: number;

  @IsString()
  @IsOptional()
  resourceKey?: string;

  @IsObject()
  @IsOptional()
  calculationInput?: Record<string, unknown>;
}
