import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundPaymentDto {
  /** Omit for a full refund. */
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
