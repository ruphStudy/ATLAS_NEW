import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsObject, Min, Max } from 'class-validator';
import {
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceProviderConfiguration,
} from '@modules/marketplace-provider/interfaces';

// ── Registration / Configuration ────────────────────────────────

export class RegisterMarketplaceDto {
  @IsEnum(MarketplaceKey)
  marketplaceKey!: MarketplaceKey;

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
}

export class ConfigureMarketplaceDto {
  @IsObject()
  configuration!: MarketplaceProviderConfiguration;

  @IsString()
  @IsOptional()
  accountId?: string;
}

export class SetMarketplacePriorityDto {
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority!: number;
}

// ── Operation Routing ────────────────────────────────────────────

export class ResolveMarketplaceOperationDto {
  @IsEnum(MarketplaceKey)
  @IsOptional()
  marketplaceKey?: MarketplaceKey;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsEnum(MarketplaceCapability)
  @IsOptional()
  capability?: MarketplaceCapability;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class ResolveMarketplaceOperationBatchDto {
  requests!: ResolveMarketplaceOperationDto[];
}
