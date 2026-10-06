import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches, Min } from 'class-validator';

export class PaymentCustomerDto {
  @IsString()
  @IsOptional()
  externalCustomerId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class PaymentMethodInputDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  /** A provider-issued token/payment-method-id — never a raw card/PAN/CVV. */
  @IsString()
  @IsOptional()
  token?: string;
}

export class CreatePaymentDto {
  /** Omit to let the framework resolve the best account by capability/country/currency/priority. */
  @IsString()
  @IsOptional()
  accountId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code' })
  currency: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsObject()
  @IsOptional()
  customer?: PaymentCustomerDto;

  @IsObject()
  @IsOptional()
  paymentMethod?: PaymentMethodInputDto;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  capture?: boolean;

  @IsString()
  @IsOptional()
  invoiceId?: string;

  @IsString()
  @IsOptional()
  billingPeriodId?: string;

  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
