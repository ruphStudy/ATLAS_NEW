export enum LocaleDirection {
  LTR = 'LTR',
  RTL = 'RTL',
}

export enum TranslationStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum LocalizationEvent {
  LOCALE_CREATED = 'localization.locale_created',
  LOCALE_UPDATED = 'localization.locale_updated',
  LOCALE_ARCHIVED = 'localization.locale_archived',
  DEFAULT_LOCALE_CHANGED = 'localization.default_locale_changed',
  NAMESPACE_CREATED = 'localization.namespace_created',
  KEY_CREATED = 'localization.key_created',
  KEY_DELETED = 'localization.key_deleted',
  TRANSLATION_UPDATED = 'localization.translation_updated',
  TRANSLATIONS_IMPORTED = 'localization.translations_imported',
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
  nativeName: string;
  displayName: string;
  direction: LocaleDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: INumberFormatConfig;
  currencyCode: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  actorId?: string;
  metadata?: Record<string, unknown>;
}
