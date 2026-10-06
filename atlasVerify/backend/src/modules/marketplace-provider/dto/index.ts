import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsObject, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  MarketplaceAccountStatus,
  MarketplaceCapability,
  MarketplaceCredentialType,
  MarketplaceKey,
  MarketplaceProviderConfiguration,
} from '../interfaces';

// ── Provider Config DTOs ──────────────────────────────────────

export class UpsertMarketplaceProviderConfigDto {
  @IsString()
  providerKey!: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  priority?: number;

  @IsObject()
  @IsOptional()
  configuration?: MarketplaceProviderConfiguration;

  @IsEnum(MarketplaceCredentialType)
  @IsOptional()
  credentialType?: MarketplaceCredentialType;
}

export class SetCredentialsDto {
  @IsString()
  providerKey!: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsEnum(MarketplaceCredentialType)
  credentialType!: MarketplaceCredentialType;

  @IsObject()
  fields!: Record<string, string>;
}

// ── Account DTOs ──────────────────────────────────────────────

export class CreateMarketplaceAccountDto {
  @IsString()
  providerKey!: string;

  @IsString()
  accountHandle!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateMarketplaceAccountDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsEnum(MarketplaceAccountStatus)
  @IsOptional()
  status?: MarketplaceAccountStatus;
}

// ── Connection Test / Health DTOs ────────────────────────────

export class TestConnectionDto {
  @IsString()
  providerKey!: string;

  @IsString()
  accountId!: string;
}

export class HealthCheckDto {
  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  accountId?: string;
}

// ── Provider Resolution DTOs ─────────────────────────────────

export class ResolveProviderDto {
  @IsEnum(MarketplaceKey)
  @IsOptional()
  marketplaceKey?: MarketplaceKey;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsEnum(MarketplaceCapability)
  @IsOptional()
  capability?: MarketplaceCapability;
}

// ── Response DTOs ─────────────────────────────────────────────

export class MarketplaceProviderConfigResponseDto {
  id!: string;
  workspaceId!: string;
  providerKey!: string;
  accountId?: string | null;
  isEnabled!: boolean;
  priority!: number;
  credentialType?: string | null;
  credentialExpiresAt?: Date | null;
  credentialValidatedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MarketplaceProviderConfigResponseDto {
    const dto = new MarketplaceProviderConfigResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.providerKey = raw['providerKey'] as string;
    dto.accountId = raw['accountId'] as string | null;
    dto.isEnabled = raw['isEnabled'] as boolean;
    dto.priority = raw['priority'] as number;
    dto.credentialType = raw['credentialType'] as string | null;
    dto.credentialExpiresAt = raw['credentialExpiresAt'] as Date | null;
    dto.credentialValidatedAt = raw['credentialValidatedAt'] as Date | null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
    // encryptedCredentials intentionally excluded
  }
}

export class MarketplaceAccountResponseDto {
  id!: string;
  workspaceId!: string;
  providerKey!: string;
  accountHandle!: string;
  displayName?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  status!: MarketplaceAccountStatus;
  isDefault!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): MarketplaceAccountResponseDto {
    const dto = new MarketplaceAccountResponseDto();
    Object.assign(dto, {
      id: raw['id'],
      workspaceId: raw['workspaceId'],
      providerKey: raw['providerKey'],
      accountHandle: raw['accountHandle'],
      displayName: raw['displayName'],
      country: raw['country'],
      region: raw['region'],
      currency: raw['currency'],
      status: raw['status'],
      isDefault: raw['isDefault'],
      createdAt: raw['createdAt'],
      updatedAt: raw['updatedAt'],
    });
    return dto;
  }
}

export class MarketplaceProviderMetadataResponseDto {
  providerKey!: string;
  displayName!: string;
  description!: string;
  version!: string;
  supportedCountries!: string[];
  supportedCapabilities!: MarketplaceCapability[];
  supportedMarketplaces!: MarketplaceKey[];
  isRegistered!: boolean;
  isActive!: boolean;
}
