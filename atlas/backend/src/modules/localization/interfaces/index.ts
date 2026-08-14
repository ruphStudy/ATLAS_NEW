export enum LocaleDirection {
  LTR = 'LTR',
  RTL = 'RTL',
}

export enum TranslationStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum MeasurementSystem {
  METRIC = 'METRIC',
  IMPERIAL = 'IMPERIAL',
}

export enum TranslationIssueType {
  MISSING = 'MISSING',
  OUTDATED = 'OUTDATED',
  CONFLICTING = 'CONFLICTING',
}

export enum LocaleStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum LocalizationEvent {
  LOCALE_CREATED = 'localization.locale_created',
  LOCALE_UPDATED = 'localization.locale_updated',
  LOCALE_ENABLED = 'localization.locale_enabled',
  LOCALE_DISABLED = 'localization.locale_disabled',
  LOCALE_ARCHIVED = 'localization.locale_archived',
  LOCALE_RESTORED = 'localization.locale_restored',
  DEFAULT_LOCALE_CHANGED = 'localization.default_locale_changed',
  LOCALE_AVAILABILITY_SET = 'localization.locale_availability_set',
  NAMESPACE_CREATED = 'localization.namespace_created',
  KEY_CREATED = 'localization.key_created',
  KEY_DELETED = 'localization.key_deleted',
  TRANSLATION_UPDATED = 'localization.translation_updated',
  TRANSLATIONS_IMPORTED = 'localization.translations_imported',
  PROVIDER_REQUIREMENT_SET = 'localization.provider_requirement_set',
}

export interface INumberFormatConfig {
  decimalSeparator: string;
  thousandsSeparator: string;
  decimalDigits?: number;
}

export interface ILocaleDefinition {
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
  numberFormat: INumberFormatConfig;
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

export interface ILocaleDefinitionHistory {
  id: string;
  localeId: string;
  version: number;
  status: LocaleStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ILocaleAvailability {
  id: string;
  localeCode: string;
  workspaceId?: string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  isPreferred: boolean;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ITranslationCompleteness {
  namespaceKey: string;
  localeCode: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completenessPercent: number;
}

export interface LocaleFilterOptions {
  search?: string | null;
  status?: LocaleStatus | null;
  direction?: LocaleDirection | null;
  language?: string | null;
  country?: string | null;
  script?: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ILocaleProviderRequirement {
  id: string;
  workspaceId?: string | null;
  marketplaceKey: string;
  countryCode?: string | null;
  requiredLocaleCode: string;
  requiredCurrencyCode?: string | null;
  requiredTimezone?: string | null;
  requiredMeasurementSystem?: MeasurementSystem | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ITranslationIssue {
  type: TranslationIssueType;
  namespaceKey: string;
  key: string;
  localeCode: string;
  message: string;
}

/** All localization dimensions resolved together through the same global→organization→workspace→user precedence. */
export interface IEffectiveRegionalSettings {
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

export interface ITranslationNamespace {
  id: string;
  key: string;
  module?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITranslationKey {
  id: string;
  namespaceId: string;
  key: string;
  description?: string | null;
  defaultValue?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITranslation {
  id: string;
  keyId: string;
  localeCode: string;
  value: string;
  version: number;
  status: TranslationStatus;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITranslationHistory {
  id: string;
  translationId: string;
  previousValue?: string | null;
  newValue: string;
  version: number;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ILocalizationEventPayload {
  event: LocalizationEvent;
  localeCode?: string;
  namespaceKey?: string;
  key?: string;
  workspaceId?: string | null;
  marketplaceKey?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
