import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RefundBillingPeriodDto {
  /** Omit for a full refund of the amount currently paid. */
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
