import { IsNumber, IsOptional, Min } from 'class-validator';

export class CapturePaymentDto {
  /** Omit for a full capture of the authorized amount. */
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number;
}
