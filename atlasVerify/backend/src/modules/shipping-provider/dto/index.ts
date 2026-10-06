import { ShippingProviderHealthResult, ShippingProviderMetadata } from '../interfaces';

export class ShippingProviderMetadataResponseDto {
  providerKey!: string;
  displayName!: string;
  description!: string;
  version!: string;
  supportedCountries!: string[];
  supportedRegions!: { code: string; displayName: string }[];
  serviceLevels!: string[];
  capabilities!: string[];
  rateLimitPerMinute!: number;
  timeoutMs!: number;
  maxRetries!: number;
  requiresCredentials!: boolean;
  credentialFields!: unknown[];

  static from(meta: ShippingProviderMetadata): ShippingProviderMetadataResponseDto {
    const dto = new ShippingProviderMetadataResponseDto();
    dto.providerKey = meta.providerKey;
    dto.displayName = meta.displayName;
    dto.description = meta.description;
    dto.version = `${meta.version.major}.${meta.version.minor}.${meta.version.patch}`;
    dto.supportedCountries = [...meta.supportedCountries];
    dto.supportedRegions = [...meta.supportedRegions];
    dto.serviceLevels = [...meta.serviceLevels];
    dto.capabilities = [...meta.capabilities];
    dto.rateLimitPerMinute = meta.rateLimitPerMinute;
    dto.timeoutMs = meta.timeoutMs;
    dto.maxRetries = meta.maxRetries;
    dto.requiresCredentials = meta.requiresCredentials;
    dto.credentialFields = meta.credentialFields;
    return dto;
  }
}

export class ShippingProviderHealthResponseDto {
  providerKey!: string;
  status!: string;
  latencyMs?: number | null;
  message?: string | null;
  checkedAt!: Date;

  static from(result: ShippingProviderHealthResult): ShippingProviderHealthResponseDto {
    const dto = new ShippingProviderHealthResponseDto();
    dto.providerKey = result.providerKey;
    dto.status = result.status;
    dto.latencyMs = result.latencyMs ?? null;
    dto.message = result.message ?? null;
    dto.checkedAt = result.checkedAt;
    return dto;
  }
}
