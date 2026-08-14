import {
  IEffectiveRegionalSettings,
  IRegionalSettingsProfile,
  IRegionalSettingsProfileHistory,
  RegionalSettingsScopeType,
  RegionalSettingsStatus,
} from '../interfaces';

// ── Profile ──────────────────────────────────────────────────────

export class CreateRegionalSettingsProfileDto {
  key!: string;
  workspaceId?: string;
  organizationId?: string;
  scopeType!: RegionalSettingsScopeType;
  countryCode?: string;
  regionCode?: string;
  localeCode?: string;
  languageCode?: string;
  currencyCode?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: Record<string, unknown>;
  measurementSystem?: string;
  addressFormat?: Record<string, unknown>;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  marketplaceKeys?: string[];
  supplierIds?: string[];
  warehouseIds?: string[];
  fulfillmentProviderKeys?: string[];
  paymentProviderKeys?: string[];
  workingDays?: number[];
  businessHours?: Record<string, unknown>;
  holidays?: Array<{ date: string; name: string }>;
  pricingPreferences?: Record<string, unknown>;
  shippingPreferences?: Record<string, unknown>;
  fulfillmentPreferences?: Record<string, unknown>;
  availabilityPreferences?: Record<string, unknown>;
  priority?: number;
  effectiveFrom!: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateRegionalSettingsProfileDto {
  localeCode?: string;
  languageCode?: string;
  currencyCode?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: Record<string, unknown>;
  measurementSystem?: string;
  addressFormat?: Record<string, unknown>;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  marketplaceKeys?: string[];
  supplierIds?: string[];
  warehouseIds?: string[];
  fulfillmentProviderKeys?: string[];
  paymentProviderKeys?: string[];
  workingDays?: number[];
  businessHours?: Record<string, unknown>;
  holidays?: Array<{ date: string; name: string }>;
  pricingPreferences?: Record<string, unknown>;
  shippingPreferences?: Record<string, unknown>;
  fulfillmentPreferences?: Record<string, unknown>;
  availabilityPreferences?: Record<string, unknown>;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class RollbackRegionalSettingsProfileDto {
  toVersion!: number;
  reason?: string;
}

export class RegionalSettingsProfileFilterDto {
  key?: string;
  workspaceId?: string;
  organizationId?: string;
  scopeType?: RegionalSettingsScopeType;
  countryCode?: string;
  regionCode?: string;
  status?: RegionalSettingsStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Resolution ───────────────────────────────────────────────────

export class ResolveRegionalSettingsDto {
  organizationId?: string;
  countryCode?: string;
  regionCode?: string;
  effectiveDate?: string;
}

// ── Response DTOs ────────────────────────────────────────────────

export class RegionalSettingsProfileResponseDto {
  id!: string;
  key!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeType!: RegionalSettingsScopeType;
  countryCode?: string | null;
  regionCode?: string | null;
  localeCode?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  numberFormat?: Record<string, unknown> | null;
  measurementSystem?: string | null;
  addressFormat?: Record<string, unknown> | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  marketplaceKeys!: string[];
  supplierIds!: string[];
  warehouseIds!: string[];
  fulfillmentProviderKeys!: string[];
  paymentProviderKeys!: string[];
  workingDays!: number[];
  businessHours!: Record<string, unknown>;
  holidays!: Array<{ date: string; name: string }>;
  pricingPreferences!: Record<string, unknown>;
  shippingPreferences!: Record<string, unknown>;
  fulfillmentPreferences!: Record<string, unknown>;
  availabilityPreferences!: Record<string, unknown>;
  priority!: number;
  status!: RegionalSettingsStatus;
  version!: number;
  supersedesId?: string | null;
  effectiveFrom!: Date;
  effectiveTo?: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(profile: IRegionalSettingsProfile): RegionalSettingsProfileResponseDto {
    const dto = new RegionalSettingsProfileResponseDto();
    dto.id = profile.id;
    dto.key = profile.key;
    dto.workspaceId = profile.workspaceId;
    dto.organizationId = profile.organizationId;
    dto.scopeType = profile.scopeType;
    dto.countryCode = profile.countryCode;
    dto.regionCode = profile.regionCode;
    dto.localeCode = profile.localeCode;
    dto.languageCode = profile.languageCode;
    dto.currencyCode = profile.currencyCode;
    dto.timezone = profile.timezone;
    dto.dateFormat = profile.dateFormat;
    dto.timeFormat = profile.timeFormat;
    dto.numberFormat = profile.numberFormat;
    dto.measurementSystem = profile.measurementSystem;
    dto.addressFormat = profile.addressFormat;
    dto.taxJurisdictionCode = profile.taxJurisdictionCode;
    dto.complianceProfileKey = profile.complianceProfileKey;
    dto.marketplaceKeys = profile.marketplaceKeys;
    dto.supplierIds = profile.supplierIds;
    dto.warehouseIds = profile.warehouseIds;
    dto.fulfillmentProviderKeys = profile.fulfillmentProviderKeys;
    dto.paymentProviderKeys = profile.paymentProviderKeys;
    dto.workingDays = profile.workingDays;
    dto.businessHours = profile.businessHours;
    dto.holidays = profile.holidays;
    dto.pricingPreferences = profile.pricingPreferences;
    dto.shippingPreferences = profile.shippingPreferences;
    dto.fulfillmentPreferences = profile.fulfillmentPreferences;
    dto.availabilityPreferences = profile.availabilityPreferences;
    dto.priority = profile.priority;
    dto.status = profile.status;
    dto.version = profile.version;
    dto.supersedesId = profile.supersedesId;
    dto.effectiveFrom = profile.effectiveFrom;
    dto.effectiveTo = profile.effectiveTo;
    dto.metadata = profile.metadata;
    dto.createdAt = profile.createdAt;
    dto.updatedAt = profile.updatedAt;
    return dto;
  }
}

export class PaginatedRegionalSettingsProfileResponseDto {
  items!: RegionalSettingsProfileResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class RegionalSettingsProfileHistoryResponseDto {
  id!: string;
  profileId!: string;
  key!: string;
  version!: number;
  status!: RegionalSettingsStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;

  static from(entry: IRegionalSettingsProfileHistory): RegionalSettingsProfileHistoryResponseDto {
    const dto = new RegionalSettingsProfileHistoryResponseDto();
    dto.id = entry.id;
    dto.profileId = entry.profileId;
    dto.key = entry.key;
    dto.version = entry.version;
    dto.status = entry.status;
    dto.changeReason = entry.changeReason;
    dto.changedBy = entry.changedBy;
    dto.createdAt = entry.createdAt;
    return dto;
  }
}

export class EffectiveRegionalSettingsResponseDto {
  localeCode?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  numberFormat?: Record<string, unknown> | null;
  measurementSystem?: string | null;
  addressFormat?: Record<string, unknown> | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  marketplaceKeys!: string[];
  supplierIds!: string[];
  warehouseIds!: string[];
  fulfillmentProviderKeys!: string[];
  paymentProviderKeys!: string[];
  workingDays!: number[];
  businessHours!: Record<string, unknown>;
  holidays!: Array<{ date: string; name: string }>;
  pricingPreferences!: Record<string, unknown>;
  shippingPreferences!: Record<string, unknown>;
  fulfillmentPreferences!: Record<string, unknown>;
  availabilityPreferences!: Record<string, unknown>;
  sources!: Record<string, string>;
  contributingProfileIds!: string[];

  static from(result: IEffectiveRegionalSettings): EffectiveRegionalSettingsResponseDto {
    const dto = new EffectiveRegionalSettingsResponseDto();
    Object.assign(dto, result);
    return dto;
  }
}
