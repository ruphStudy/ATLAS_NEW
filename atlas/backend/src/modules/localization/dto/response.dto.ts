import { LocaleDirection, TranslationStatus } from '../interfaces';

export class LocaleResponseDto {
  id: string;
  code: string;
  language: string;
  country?: string | null;
  nativeName: string;
  displayName: string;
  direction: LocaleDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: unknown;
  currencyCode: string;
  isActive: boolean;
  isDefault: boolean;
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
