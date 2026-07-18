import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProviderCapability, SupplierProviderCode } from '../interfaces';

export class SearchSuppliersDto {
  @IsString()
  keyword!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SupplierProviderCode)
  providerCode?: SupplierProviderCode;
}

export class SearchProductsDto {
  @IsString()
  keyword!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsEnum(SupplierProviderCode)
  providerCode?: SupplierProviderCode;
}

export class GetSupplierDetailsDto {
  @IsString()
  providerSupplierId!: string;

  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;
}

export class GetProductDetailsDto {
  @IsString()
  providerProductId!: string;

  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;
}

export class RequestQuotationDto {
  @IsString()
  providerSupplierId!: string;

  @IsOptional()
  @IsString()
  providerProductId?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;
}

export class DownloadCatalogDto {
  @IsString()
  providerSupplierId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;
}

export class ValidateSupplierDto {
  @IsString()
  providerSupplierId!: string;

  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;
}

export class ValidateProductDto {
  @IsString()
  providerProductId!: string;

  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;
}

export class ProviderConfigDto {
  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;

  @IsBoolean()
  isEnabled!: boolean;

  @IsInt()
  @Min(1)
  @Max(999)
  priority!: number;

  @IsOptional()
  @IsInt()
  @Min(1_000)
  timeoutMs?: number;
}

export class ProviderCredentialsDto {
  @IsEnum(SupplierProviderCode)
  providerCode!: SupplierProviderCode;

  @IsOptional()
  credentials?: Record<string, string>;
}
