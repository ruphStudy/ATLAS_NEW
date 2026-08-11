import { IsDateString, IsNumber, IsObject, IsOptional, IsPositive } from 'class-validator';

/** Records the RESULT of a payment already collected elsewhere (Payment Provider Framework) — never initiates a charge itself. */
export class RecordPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  @IsOptional()
  paidAt?: string;

  /** Opaque pointer into the external payment system (e.g. `{provider, transactionId}`) — never interpreted here. */
  @IsObject()
  @IsOptional()
  externalReference?: Record<string, unknown>;
}
