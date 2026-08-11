import { Injectable } from '@nestjs/common';
import { OrganizationSettingsService } from '@modules/organization-settings/organization-settings.service';
import { UserPreferencesService } from '@modules/user-preferences/user-preferences.service';
import { LocalizationRepository } from './localization.repository';
import { TranslationCacheService } from './translation-cache.service';
import { LocalizationEventQueue } from './jobs';
import {
  CreateLocaleDto,
  UpdateLocaleDto,
  CreateNamespaceDto,
  CreateTranslationKeyDto,
  SetTranslationDto,
  ImportTranslationsDto,
} from './dto';
import {
  ILocaleDefinition,
  ITranslationNamespace,
  ITranslationKey,
  ITranslation,
  ITranslationHistory,
  INumberFormatConfig,
  TranslationStatus,
  LocaleDirection,
  LocalizationEvent,
} from './interfaces';
import {
  LOCALIZATION_MANAGE_ROLES,
  ORG_LOCALE_SETTING_KEY,
  USER_LOCALE_SETTING_KEY,
  DEFAULT_FALLBACK_LOCALE,
  INTERPOLATION_PATTERN,
} from './constants';
import {
  LocaleNotFoundException,
  LocaleAlreadyExistsException,
  TranslationNamespaceNotFoundException,
  TranslationNamespaceAlreadyExistsException,
  TranslationKeyNotFoundException,
  TranslationKeyAlreadyExistsException,
  LocalizationAccessDeniedException,
} from './exceptions/localization.exceptions';

const DEFAULT_NUMBER_FORMAT: INumberFormatConfig = { decimalSeparator: '.', thousandsSeparator: ',' };

@Injectable()
export class LocalizationService {
  constructor(
    private readonly repository: LocalizationRepository,
    private readonly cache: TranslationCacheService,
    private readonly organizationSettingsService: OrganizationSettingsService,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly eventQueue: LocalizationEventQueue,
  ) {}

  // ── Locale registry ──────────────────────────────────────────────

  async createLocale(userRole: string, actorId: string, dto: CreateLocaleDto): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);

    const existing = await this.repository.findLocaleByCode(dto.code);
    if (existing) {
      throw new LocaleAlreadyExistsException(dto.code);
    }

    const currentDefault = await this.repository.findDefaultLocale();
    const locale = await this.repository.createLocale({
      code: dto.code,
      language: dto.language,
      country: dto.country,
      nativeName: dto.nativeName,
      displayName: dto.displayName,
      direction: dto.direction ?? LocaleDirection.LTR,
      dateFormat: dto.dateFormat ?? 'YYYY-MM-DD',
      timeFormat: dto.timeFormat ?? 'HH:mm',
      numberFormat: (dto.numberFormat as INumberFormatConfig) ?? DEFAULT_NUMBER_FORMAT,
      currencyCode: dto.currencyCode ?? 'USD',
      isActive: true,
      isDefault: !currentDefault,
    });

    await this.publishEvent(LocalizationEvent.LOCALE_CREATED, { localeCode: locale.code, actorId });
    return locale;
  }

  async updateLocale(code: string, userRole: string, actorId: string, dto: UpdateLocaleDto): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);

    const updated = await this.repository.updateLocale(locale.id, {
      nativeName: dto.nativeName,
      displayName: dto.displayName,
      direction: dto.direction,
      dateFormat: dto.dateFormat,
      timeFormat: dto.timeFormat,
      numberFormat: dto.numberFormat as INumberFormatConfig,
      currencyCode: dto.currencyCode,
      isActive: dto.isActive,
    } as Partial<ILocaleDefinition>);

    await this.publishEvent(LocalizationEvent.LOCALE_UPDATED, { localeCode: code, actorId });
    return updated;
  }

  async archiveLocale(code: string, userRole: string, actorId: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);
    if (locale.isDefault) {
      throw new LocalizationAccessDeniedException();
    }

    const updated = await this.repository.updateLocale(locale.id, { isActive: false } as Partial<ILocaleDefinition>);
    await this.publishEvent(LocalizationEvent.LOCALE_ARCHIVED, { localeCode: code, actorId });
    return updated;
  }

  async setDefaultLocale(code: string, userRole: string, actorId: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);

    await this.repository.clearDefaultLocale();
    const updated = await this.repository.updateLocale(locale.id, { isDefault: true, isActive: true } as Partial<ILocaleDefinition>);

    await this.publishEvent(LocalizationEvent.DEFAULT_LOCALE_CHANGED, { localeCode: code, actorId });
    return updated;
  }

  async listLocales(activeOnly = false): Promise<ILocaleDefinition[]> {
    return this.repository.listLocales(activeOnly);
  }

  async getLocale(code: string): Promise<ILocaleDefinition> {
    return this.getLocaleOrThrow(code);
  }

  // ── Namespaces & keys ────────────────────────────────────────────

  async createNamespace(userRole: string, actorId: string, dto: CreateNamespaceDto): Promise<ITranslationNamespace> {
    this.assertCanManage(userRole);
    const existing = await this.repository.findNamespaceByKey(dto.key);
    if (existing) {
      throw new TranslationNamespaceAlreadyExistsException(dto.key);
    }

    const namespace = await this.repository.createNamespace({
      key: dto.key,
      module: dto.module,
      description: dto.description,
    });
    await this.publishEvent(LocalizationEvent.NAMESPACE_CREATED, { namespaceKey: namespace.key, actorId });
    return namespace;
  }

  async listNamespaces(): Promise<ITranslationNamespace[]> {
    return this.repository.listNamespaces();
  }

  async getNamespace(key: string): Promise<ITranslationNamespace> {
    return this.getNamespaceOrThrow(key);
  }

  async createKey(namespaceKey: string, userRole: string, actorId: string, dto: CreateTranslationKeyDto): Promise<ITranslationKey> {
    this.assertCanManage(userRole);
    const namespace = await this.getNamespaceOrThrow(namespaceKey);

    const existing = await this.repository.findKeyByNamespaceAndKey(namespace.id, dto.key);
    if (existing) {
      throw new TranslationKeyAlreadyExistsException(dto.key);
    }

    const key = await this.repository.createKey({
      namespaceId: namespace.id,
      key: dto.key,
      description: dto.description,
      defaultValue: dto.defaultValue,
    });
    await this.publishEvent(LocalizationEvent.KEY_CREATED, { namespaceKey, key: dto.key, actorId });
    return key;
  }

  async listKeys(namespaceKey: string): Promise<ITranslationKey[]> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    return this.repository.listKeys(namespace.id);
  }

  async deleteKey(namespaceKey: string, key: string, userRole: string, actorId: string): Promise<void> {
    this.assertCanManage(userRole);
    const { keyEntity } = await this.getKeyOrThrow(namespaceKey, key);

    await this.repository.deleteKey(keyEntity.id);
    this.cache.invalidateKey(namespaceKey, key);
    await this.publishEvent(LocalizationEvent.KEY_DELETED, { namespaceKey, key, actorId });
  }

  // ── Translations ─────────────────────────────────────────────────

  async setTranslation(
    namespaceKey: string,
    key: string,
    localeCode: string,
    userRole: string,
    actorId: string,
    dto: SetTranslationDto,
  ): Promise<ITranslation> {
    this.assertCanManage(userRole);
    const { keyEntity } = await this.getKeyOrThrow(namespaceKey, key);
    await this.getLocaleOrThrow(localeCode);

    const translation = await this.upsertTranslation(keyEntity.id, localeCode, dto.value, actorId);

    this.cache.invalidateKey(namespaceKey, key);
    await this.publishEvent(LocalizationEvent.TRANSLATION_UPDATED, { namespaceKey, key, localeCode, actorId });
    return translation;
  }

  async getTranslationHistory(namespaceKey: string, key: string, localeCode: string): Promise<ITranslationHistory[]> {
    const { keyEntity } = await this.getKeyOrThrow(namespaceKey, key);
    const translation = await this.repository.findTranslation(keyEntity.id, localeCode);
    if (!translation) {
      return [];
    }
    return this.repository.listTranslationHistory(translation.id);
  }

  // ── Translate (the hot path: cached, fallback-chained, interpolated) ──

  async translate(namespaceKey: string, key: string, localeCode: string, params?: Record<string, string | number>): Promise<string> {
    const cacheKey = this.cache.buildKey(namespaceKey, key, localeCode);
    let raw = this.cache.get(cacheKey);
    if (raw === undefined) {
      raw = await this.resolveRawTranslation(namespaceKey, key, localeCode);
      this.cache.set(cacheKey, raw);
    }
    return this.interpolate(raw, params);
  }

  async bulkTranslate(namespaceKey: string, localeCode: string): Promise<Record<string, string>> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const keys = await this.repository.listKeys(namespace.id);

    const result: Record<string, string> = {};
    for (const keyEntity of keys) {
      result[keyEntity.key] = await this.translate(namespaceKey, keyEntity.key, localeCode);
    }
    return result;
  }

  // ── Import / export ──────────────────────────────────────────────

  async exportNamespace(namespaceKey: string, localeCode: string): Promise<Record<string, string>> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const rows = await this.repository.listTranslationsForNamespace(namespace.id, localeCode);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async importNamespace(
    namespaceKey: string,
    localeCode: string,
    userRole: string,
    actorId: string,
    dto: ImportTranslationsDto,
  ): Promise<{ imported: number }> {
    this.assertCanManage(userRole);
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    await this.getLocaleOrThrow(localeCode);

    let imported = 0;
    for (const [key, value] of Object.entries(dto.translations)) {
      let keyEntity = await this.repository.findKeyByNamespaceAndKey(namespace.id, key);
      if (!keyEntity) {
        keyEntity = await this.repository.createKey({ namespaceId: namespace.id, key });
      }
      await this.upsertTranslation(keyEntity.id, localeCode, value, actorId);
      imported += 1;
    }

    this.cache.invalidateAll();
    await this.publishEvent(LocalizationEvent.TRANSLATIONS_IMPORTED, {
      namespaceKey,
      localeCode,
      actorId,
      metadata: { count: imported },
    });
    return { imported };
  }

  // ── Missing-key detection ────────────────────────────────────────

  async findMissingKeys(namespaceKey: string, localeCode: string): Promise<string[]> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const [allKeys, existing] = await Promise.all([
      this.repository.listKeys(namespace.id),
      this.repository.listTranslationsForNamespace(namespace.id, localeCode),
    ]);

    const existingKeySet = new Set(existing.map((row) => row.key));
    return allKeys.filter((k) => !existingKeySet.has(k.key)).map((k) => k.key);
  }

  // ── Effective locale (resolves through Organization Settings / User Preferences) ──

  async resolveEffectiveLocale(workspaceId: string, userId: string): Promise<{ localeCode: string; source: string }> {
    const userLocale = await this.userPreferencesService.resolveKey(workspaceId, userId, USER_LOCALE_SETTING_KEY);
    if (userLocale.source !== 'DEFAULT' && typeof userLocale.value === 'string' && userLocale.value) {
      return { localeCode: userLocale.value, source: 'USER' };
    }

    const orgLocale = await this.organizationSettingsService.resolveKey(workspaceId, userId, ORG_LOCALE_SETTING_KEY);
    if (orgLocale.source !== 'DEFAULT' && typeof orgLocale.value === 'string' && orgLocale.value) {
      return { localeCode: orgLocale.value, source: 'ORGANIZATION' };
    }

    const defaultLocale = await this.repository.findDefaultLocale();
    return { localeCode: defaultLocale?.code ?? DEFAULT_FALLBACK_LOCALE, source: 'SYSTEM_DEFAULT' };
  }

  // ── Locale-aware formatting / parsing / sorting (provider-independent — built on `Intl`) ──

  async formatDate(dateIso: string, localeCode?: string): Promise<string> {
    const locale = await this.resolveFormattingLocale(localeCode);
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateIso));
  }

  async formatNumber(value: number, localeCode?: string): Promise<string> {
    const locale = await this.resolveFormattingLocale(localeCode);
    return new Intl.NumberFormat(locale).format(value);
  }

  async formatCurrency(value: number, localeCode?: string, currencyCode?: string): Promise<string> {
    const localeDef = localeCode ? await this.repository.findLocaleByCode(localeCode) : await this.repository.findDefaultLocale();
    const locale = localeDef?.code ?? DEFAULT_FALLBACK_LOCALE;
    const currency = currencyCode ?? localeDef?.currencyCode ?? 'USD';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }

  async parseNumber(value: string, localeCode?: string): Promise<number> {
    const localeDef = localeCode ? await this.repository.findLocaleByCode(localeCode) : await this.repository.findDefaultLocale();
    const format = (localeDef?.numberFormat as INumberFormatConfig) ?? DEFAULT_NUMBER_FORMAT;

    let normalized = format.thousandsSeparator ? value.split(format.thousandsSeparator).join('') : value;
    if (format.decimalSeparator && format.decimalSeparator !== '.') {
      normalized = normalized.split(format.decimalSeparator).join('.');
    }
    return parseFloat(normalized);
  }

  sortLocaleAware(items: string[], localeCode?: string): string[] {
    const collator = new Intl.Collator(localeCode ?? DEFAULT_FALLBACK_LOCALE);
    return [...items].sort(collator.compare);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async upsertTranslation(keyId: string, localeCode: string, value: string, actorId: string): Promise<ITranslation> {
    const existing = await this.repository.findTranslation(keyId, localeCode);

    if (existing) {
      const newVersion = existing.version + 1;
      const updated = await this.repository.updateTranslation(existing.id, {
        value,
        version: newVersion,
        updatedBy: actorId,
      } as Partial<ITranslation>);
      await this.repository.createTranslationHistory({
        translationId: existing.id,
        previousValue: existing.value,
        newValue: value,
        version: newVersion,
        changedBy: actorId,
      });
      return updated;
    }

    const created = await this.repository.createTranslation({
      keyId,
      localeCode,
      value,
      version: 1,
      status: TranslationStatus.PUBLISHED,
      updatedBy: actorId,
    });
    await this.repository.createTranslationHistory({
      translationId: created.id,
      previousValue: null,
      newValue: value,
      version: 1,
      changedBy: actorId,
    });
    return created;
  }

  private async resolveRawTranslation(namespaceKey: string, key: string, localeCode: string): Promise<string> {
    const namespace = await this.repository.findNamespaceByKey(namespaceKey);
    if (!namespace) {
      return key;
    }
    const keyEntity = await this.repository.findKeyByNamespaceAndKey(namespace.id, key);
    if (!keyEntity) {
      return key;
    }

    const exact = await this.repository.findTranslation(keyEntity.id, localeCode);
    if (exact && exact.status === TranslationStatus.PUBLISHED) {
      return exact.value;
    }

    const language = localeCode.split('-')[0];
    if (language !== localeCode) {
      const languageMatch = await this.repository.findTranslation(keyEntity.id, language);
      if (languageMatch && languageMatch.status === TranslationStatus.PUBLISHED) {
        return languageMatch.value;
      }
    }

    const fallbackLocale = (await this.repository.findDefaultLocale())?.code ?? DEFAULT_FALLBACK_LOCALE;
    if (fallbackLocale !== localeCode) {
      const fallbackMatch = await this.repository.findTranslation(keyEntity.id, fallbackLocale);
      if (fallbackMatch && fallbackMatch.status === TranslationStatus.PUBLISHED) {
        return fallbackMatch.value;
      }
    }

    return keyEntity.defaultValue ?? key;
  }

  private interpolate(text: string, params?: Record<string, string | number>): string {
    if (!params) {
      return text;
    }
    return text.replace(INTERPOLATION_PATTERN, (match, token) => {
      const value = params[token];
      return value !== undefined ? String(value) : match;
    });
  }

  private async resolveFormattingLocale(localeCode?: string): Promise<string> {
    if (localeCode) {
      return localeCode;
    }
    const defaultLocale = await this.repository.findDefaultLocale();
    return defaultLocale?.code ?? DEFAULT_FALLBACK_LOCALE;
  }

  private async getLocaleOrThrow(code: string): Promise<ILocaleDefinition> {
    const locale = await this.repository.findLocaleByCode(code);
    if (!locale) {
      throw new LocaleNotFoundException(code);
    }
    return locale;
  }

  private async getNamespaceOrThrow(key: string): Promise<ITranslationNamespace> {
    const namespace = await this.repository.findNamespaceByKey(key);
    if (!namespace) {
      throw new TranslationNamespaceNotFoundException(key);
    }
    return namespace;
  }

  private async getKeyOrThrow(
    namespaceKey: string,
    key: string,
  ): Promise<{ namespace: ITranslationNamespace; keyEntity: ITranslationKey }> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const keyEntity = await this.repository.findKeyByNamespaceAndKey(namespace.id, key);
    if (!keyEntity) {
      throw new TranslationKeyNotFoundException(key);
    }
    return { namespace, keyEntity };
  }

  private assertCanManage(userRole: string): void {
    if (!LOCALIZATION_MANAGE_ROLES.includes(userRole)) {
      throw new LocalizationAccessDeniedException();
    }
  }

  private async publishEvent(
    event: LocalizationEvent,
    opts: { localeCode?: string; namespaceKey?: string; key?: string; actorId?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
