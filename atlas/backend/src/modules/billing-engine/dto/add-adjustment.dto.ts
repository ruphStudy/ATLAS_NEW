import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { BillingItemType } from '../interfaces';

export class AddAdjustmentDto {
  @IsEnum(BillingItemType)
  @IsOptional()
  type?: BillingItemType;

  @IsString()
  @IsNotEmpty()
  description!: string;

  /** Positive to charge more, negative to discount/credit. */
  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
