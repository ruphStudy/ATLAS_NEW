import {
  AtlasProduct,
  AtlasQuotation,
  AtlasSupplier,
  AtlasValidationResult,
  NormalizedProviderError,
  ProviderCapability,
  ProviderHealthResult,
  ProviderMetadata,
  ProviderResponseMeta,
  SupplierProviderCode,
} from '../interfaces';

export class ProviderMetadataResponseDto {
  code!: SupplierProviderCode;
  displayName!: string;
  description!: string;
  version!: string;
  supportedCountries!: string[];
  capabilities!: ProviderCapability[];
  rateLimitPerMinute!: number;
  timeoutMs!: number;
  maxRetries!: number;
  requiresCredentials!: boolean;
  credentialFields!: unknown[];

  static from(meta: ProviderMetadata): ProviderMetadataResponseDto {
    const dto = new ProviderMetadataResponseDto();
    dto.code = meta.code;
    dto.displayName = meta.displayName;
    dto.description = meta.description;
    dto.version = `${meta.version.major}.${meta.version.minor}.${meta.version.patch}`;
    dto.supportedCountries = [...meta.supportedCountries];
    dto.capabilities = [...meta.capabilities];
    dto.rateLimitPerMinute = meta.rateLimitPerMinute;
    dto.timeoutMs = meta.timeoutMs;
    dto.maxRetries = meta.maxRetries;
    dto.requiresCredentials = meta.requiresCredentials;
    dto.credentialFields = meta.credentialFields;
    return dto;
  }
}

export class ProviderHealthResponseDto {
  providerCode!: SupplierProviderCode;
  status!: string;
  latencyMs?: number | null;
  message?: string | null;
  checkedAt!: Date;

  static from(result: ProviderHealthResult): ProviderHealthResponseDto {
    const dto = new ProviderHealthResponseDto();
    dto.providerCode = result.providerCode;
    dto.status = result.status;
    dto.latencyMs = result.latencyMs ?? null;
    dto.message = result.message ?? null;
    dto.checkedAt = result.checkedAt;
    return dto;
  }
}

export class ProviderResponseDto<T> {
  requestId!: string;
  providerCode!: SupplierProviderCode;
  success!: boolean;
  data?: T;
  error?: NormalizedProviderError | null;
  meta!: ProviderResponseMeta;
}

export class AtlasSupplierResponseDto implements AtlasSupplier {
  providerCode!: SupplierProviderCode;
  providerSupplierId!: string;
  name!: string;
  country!: string;
  city?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  categories!: string[];
  minOrderQuantity?: number | null;
  avgLeadTimeDays?: number | null;
  overallRating?: number | null;
  isVerified!: boolean;
  tier?: string | null;
  rawData!: Record<string, unknown>;
}

export class AtlasProductResponseDto implements AtlasProduct {
  providerCode!: SupplierProviderCode;
  providerProductId!: string;
  name!: string;
  description?: string | null;
  category?: string | null;
  subCategory?: string | null;
  brand?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQuantity?: number | null;
  images!: string[];
  attributes!: Record<string, string>;
  supplierProviderSupplierId?: string | null;
  rawData!: Record<string, unknown>;
}

export class AtlasQuotationResponseDto implements AtlasQuotation {
  providerCode!: SupplierProviderCode;
  providerQuotationId!: string;
  supplierId!: string;
  productId?: string | null;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  currency!: string;
  leadTimeDays?: number | null;
  validUntil?: Date | null;
  terms?: string | null;
  rawData!: Record<string, unknown>;
}

export class AtlasValidationResponseDto implements AtlasValidationResult {
  isValid!: boolean;
  score!: number;
  checks!: { checkName: string; passed: boolean; score: number; notes?: string | null }[];
  summary!: string;
}
