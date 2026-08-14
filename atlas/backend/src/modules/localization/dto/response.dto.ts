import { LocaleDirection, LocaleStatus, MeasurementSystem, TranslationStatus, TranslationIssueType } from '../interfaces';

export class LocaleResponseDto {
  id: string;
  code: string;
  language: string;
  country?: string | null;
  script?: string | null;
  nativeName: string;
  displayName: string;
  direction: LocaleDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: unknown;
  currencyCode: string;
  timezone: string;
  measurementSystem: MeasurementSystem;
  fallbackLocaleCode?: string | null;
  status: LocaleStatus;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedLocaleResponseDto {
  data: LocaleResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class LocaleHistoryResponseDto {
  id: string;
  localeId: string;
  version: number;
  status: LocaleStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class LocaleAvailabilityResponseDto {
  id: string;
  localeCode: string;
  workspaceId?: string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  isPreferred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TranslationCompletenessResponseDto {
  namespaceKey: string;
  localeCode: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completenessPercent: number;
}

export class LocaleProviderRequirementResponseDto {
  id: string;
  workspaceId?: string | null;
  marketplaceKey: string;
  countryCode?: string | null;
  requiredLocaleCode: string;
  requiredCurrencyCode?: string | null;
  requiredTimezone?: string | null;
  requiredMeasurementSystem?: MeasurementSystem | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TranslationIssueResponseDto {
  type: TranslationIssueType;
  namespaceKey: string;
  key: string;
  localeCode: string;
  message: string;
}

export class EffectiveRegionalSettingsResponseDto {
  localeCode: string;
  localeSource: string;
  timezone: string;
  timezoneSource: string;
  currencyCode: string;
  currencySource: string;
  dateFormat: string;
  dateFormatSource: string;
  numberFormat: string;
  numberFormatSource: string;
  measurementSystem: MeasurementSystem;
  measurementSystemSource: string;
}

export class TranslationNamespaceResponseDto {
  id: string;
  key: string;
  module?: string | null;
  description?: string | null;
}

export class TranslationKeyResponseDto {
  id: string;
  namespaceId: string;
  key: string;
  description?: string | null;
  defaultValue?: string | null;
}

export class TranslationResponseDto {
  id: string;
  keyId: string;
  localeCode: string;
  value: string;
  version: number;
  status: TranslationStatus;
  updatedAt: Date;
}

export class TranslationHistoryResponseDto {
  id: string;
  translationId: string;
  previousValue?: string | null;
  newValue: string;
  version: number;
  changedBy?: string | null;
  createdAt: Date;
}

export class MissingKeysResponseDto {
  namespaceKey: string;
  localeCode: string;
  missingKeys: string[];
}

export class EffectiveLocaleResponseDto {
  localeCode: string;
  source: string;
}
