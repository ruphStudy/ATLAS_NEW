import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaymentProviderAccountStatus } from '../interfaces';

export class UpdatePaymentProviderAccountDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsEnum(PaymentProviderAccountStatus)
  @IsOptional()
  status?: PaymentProviderAccountStatus;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedCountries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedCurrencies?: string[];
}
