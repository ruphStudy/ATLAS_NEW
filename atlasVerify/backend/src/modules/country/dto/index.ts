import { CountryProviderDomain, CountryStatus, ICountry, MarketplaceCapability, MarketplaceKey } from '../interfaces';

// ── Create / Update Country ──────────────────────────────────────

export class CreateCountryDto {
  code!: string;
  name!: string;
  region?: string;
  timezone!: string;
  locale!: string;
  currency!: string;
  language!: string;
  supportedLocales?: string[];
  supportedCurrencies?: string[];
  supportedLanguages?: string[];
  taxRegime?: string;
  complianceRefs?: string[];
  businessRules?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateCountryDto {
  name?: string;
  region?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  language?: string;
  supportedLocales?: string[];
  supportedCurrencies?: string[];
  supportedLanguages?: string[];
  taxRegime?: string;
  complianceRefs?: string[];
  businessRules?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

// ── Workspace Country Config ─────────────────────────────────────

export class UpsertWorkspaceCountryConfigDto {
  countryCode!: string;
  organizationId?: string;
  isEnabled?: boolean;
  isDefault?: boolean;
  isPreferred?: boolean;
  priority?: number;
  fallbackCountryCode?: string;
  configuration?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string;
}

// ── Override ──────────────────────────────────────────────────────

export class CreateCountryOverrideDto {
  countryCode!: string;
  workspaceId?: string;
  organizationId?: string;
  overrideType!: string;
  overrideValue!: Record<string, unknown>;
  priority?: number;
  reason?: string;
}

// ── Provider Availability ────────────────────────────────────────

export class UpsertProviderAvailabilityDto {
  countryCode!: string;
  domain!: CountryProviderDomain;
  providerKey!: string;
  workspaceId?: string;
  isAvailable?: boolean;
  metadata?: Record<string, unknown>;
}

// ── Resolution / Validation ──────────────────────────────────────

export class ResolveCountryContextDto {
  workspaceId!: string;
  organizationId?: string;
  countryCode?: string;
}

export class ValidateCountryCombinationDto {
  workspaceId!: string;
  countryCode!: string;
  providerKey?: string;
  marketplaceKey?: MarketplaceKey;
  capability?: MarketplaceCapability;
  providerDomain?: CountryProviderDomain;
  currency?: string;
  locale?: string;
  featureFlags?: Record<string, boolean>;
}

// ── Filters ───────────────────────────────────────────────────────

export class CountryFilterDto {
  code?: string;
  region?: string;
  status?: CountryStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Response DTOs ─────────────────────────────────────────────────

export class CountryResponseDto {
  id!: string;
  code!: string;
  name!: string;
  region?: string | null;
  timezone!: string;
  locale!: string;
  currency!: string;
  language!: string;
  supportedLocales!: string[];
  supportedCurrencies!: string[];
  supportedLanguages!: string[];
  taxRegime?: string | null;
  complianceRefs!: string[];
  businessRules!: Record<string, unknown>;
  status!: CountryStatus;
  version!: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(country: ICountry): CountryResponseDto {
    const dto = new CountryResponseDto();
    dto.id = country.id;
    dto.code = country.code;
    dto.name = country.name;
    dto.region = country.region;
    dto.timezone = country.timezone;
    dto.locale = country.locale;
    dto.currency = country.currency;
    dto.language = country.language;
    dto.supportedLocales = country.supportedLocales;
    dto.supportedCurrencies = country.supportedCurrencies;
    dto.supportedLanguages = country.supportedLanguages;
    dto.taxRegime = country.taxRegime;
    dto.complianceRefs = country.complianceRefs;
    dto.businessRules = country.businessRules;
    dto.status = country.status;
    dto.version = country.version;
    dto.effectiveFrom = country.effectiveFrom;
    dto.effectiveTo = country.effectiveTo;
    dto.createdAt = country.createdAt;
    dto.updatedAt = country.updatedAt;
    return dto;
  }
}

export class PaginatedCountryResponseDto {
  items!: CountryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
