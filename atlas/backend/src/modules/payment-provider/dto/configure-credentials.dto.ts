import { IsNotEmptyObject, IsObject } from 'class-validator';

/** Plain-text values only at this boundary — encrypted immediately by `PaymentCredentialEncryptor` before persistence, never logged or echoed back. */
export class ConfigurePaymentCredentialsDto {
  @IsObject()
  @IsNotEmptyObject()
  fields!: Record<string, string>;
}
