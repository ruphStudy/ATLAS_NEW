import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InvoiceType } from '../interfaces';

export class GenerateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  billingPeriodId: string;

  @IsEnum(InvoiceType)
  @IsOptional()
  type?: InvoiceType;

  /** A repeat call with the same key returns the previously generated invoice instead of creating a duplicate. */
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
