import { Injectable, Logger } from '@nestjs/common';
import { OrganizationSettingsService } from '@modules/organization-settings/organization-settings.service';
import { OrganizationSettingsCategory } from '@modules/organization-settings/constants';
import { UserPreferencesService } from '@modules/user-preferences/user-preferences.service';
import { UserPreferencesCategory } from '@modules/user-preferences/constants';
import { SettingScope } from '@modules/settings/interfaces';
import { LocalizationRepository } from './localization.repository';
import { TranslationCacheService } from './translation-cache.service';
import { LocalizationEventQueue } from './jobs';
import {
  CreateLocaleDto,
  UpdateLocaleDto,
  LocaleFilterDto,
  CreateNamespaceDto,
  CreateTranslationKeyDto,
  SetTranslationDto,
  ImportTranslationsDto,
  SetProviderRequirementDto,
  SetLocaleAvailabilityDto,
  PaginatedLocaleResponseDto,
} from './dto';
import {
  ILocaleDefinition,
  ILocaleDefinitionHistory,
  ILocaleAvailability,
  ITranslationNamespace,
  ITranslationKey,
  ITranslation,
  ITranslationHistory,
  ILocaleProviderRequirement,
  ITranslationIssue,
  ITranslationCompleteness,
  IEffectiveRegionalSettings,
  INumberFormatConfig,
  TranslationStatus,
  TranslationIssueType,
  LocaleDirection,
  LocaleStatus,
  MeasurementSystem,
  LocalizationEvent,
} from './interfaces';
import {
  LOCALIZATION_MANAGE_ROLES,
  LOCALE_ALLOWED_TRANSITIONS,
  LOCALE_FALLBACK_MAX_DEPTH,
  ORG_LOCALE_SETTING_KEY,
  USER_LOCALE_SETTING_KEY,
  ORG_TIMEZONE_SETTING_KEY,
  USER_TIMEZONE_SETTING_KEY,
  ORG_CURRENCY_SETTING_KEY,
  USER_CURRENCY_SETTING_KEY,
  ORG_DATE_FORMAT_SETTING_KEY,
  USER_DATE_FORMAT_SETTING_KEY,
  ORG_NUMBER_FORMAT_SETTING_KEY,
  USER_NUMBER_FORMAT_SETTING_KEY,
  ORG_MEASUREMENT_SYSTEM_SETTING_KEY,
  USER_MEASUREMENT_SYSTEM_SETTING_KEY,
  ORG_ENABLED_LANGUAGES_SETTING_KEY,
  USER_PREFERRED_LANGUAGES_SETTING_KEY,
  DEFAULT_FALLBACK_LOCALE,
  DEFAULT_FALLBACK_TIMEZONE,
  DEFAULT_FALLBACK_MEASUREMENT_SYSTEM,
  INTERPOLATION_PATTERN,
} from './constants';
import {
  LocaleNotFoundException,
  LocaleAlreadyExistsException,
  InvalidFallbackLocaleException,
  FallbackLocaleCycleException,
  LocaleInvalidStateTransitionException,
  TranslationNamespaceNotFoundException,
  TranslationNamespaceAlreadyExistsException,
  TranslationKeyNotFoundException,
  TranslationKeyAlreadyExistsException,
  LocalizationAccessDeniedException,
} from './exceptions/localization.exceptions';

const ACTIVE_LOCALES_CACHE_KEY = 'locales:active';

const DEFAULT_NUMBER_FORMAT: INumberFormatConfig = { decimalSeparator: '.', thousandsSeparator: ',' };

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);

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

    if (dto.fallbackLocaleCode) {
      await this.assertValidFallback(dto.code, dto.fallbackLocaleCode);
    }

    const currentDefault = await this.repository.findDefaultLocale();
    const locale = await this.repository.createLocale({
      code: dto.code,
      language: dto.language,
      country: dto.country,
      script: dto.script ?? null,
      nativeName: dto.nativeName,
      displayName: dto.displayName,
      direction: dto.direction ?? LocaleDirection.LTR,
      dateFormat: dto.dateFormat ?? 'YYYY-MM-DD',
      timeFormat: dto.timeFormat ?? 'HH:mm',
      numberFormat: (dto.numberFormat as INumberFormatConfig) ?? DEFAULT_NUMBER_FORMAT,
      currencyCode: dto.currencyCode ?? 'USD',
      timezone: dto.timezone ?? DEFAULT_FALLBACK_TIMEZONE,
      measurementSystem: dto.measurementSystem ?? DEFAULT_FALLBACK_MEASUREMENT_SYSTEM,
      fallbackLocaleCode: dto.fallbackLocaleCode ?? null,
      status: LocaleStatus.ACTIVE,
      version: 1,
      isActive: true,
      isDefault: !currentDefault,
    });

    await this.recordLocaleHistory(locale, 'Created', actorId);
    this.cache.invalidateExact(ACTIVE_LOCALES_CACHE_KEY);
    await this.publishEvent(LocalizationEvent.LOCALE_CREATED, { localeCode: locale.code, actorId });
    return locale;
  }

  async updateLocale(code: string, userRole: string, actorId: string, dto: UpdateLocaleDto): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);

    if (dto.fallbackLocaleCode) {
      await this.assertValidFallback(code, dto.fallbackLocaleCode);
    }

    const updated = await this.repository.updateLocale(locale.id, {
      nativeName: dto.nativeName,
      displayName: dto.displayName,
      script: dto.script,
      direction: dto.direction,
      dateFormat: dto.dateFormat,
      timeFormat: dto.timeFormat,
      numberFormat: dto.numberFormat as INumberFormatConfig,
      currencyCode: dto.currencyCode,
      timezone: dto.timezone,
      measurementSystem: dto.measurementSystem,
      fallbackLocaleCode: dto.fallbackLocaleCode,
      isActive: dto.isActive,
      version: locale.version + 1,
    } as Partial<ILocaleDefinition>);

    await this.recordLocaleHistory(updated, dto.changeReason ?? 'Updated', actorId);
    this.cache.invalidateExact(ACTIVE_LOCALES_CACHE_KEY);
    await this.publishEvent(LocalizationEvent.LOCALE_UPDATED, { localeCode: code, actorId });
    return updated;
  }

  async enableLocale(code: string, userRole: string, actorId: string, reason?: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    return this.transitionLocale(await this.getLocaleOrThrow(code), LocaleStatus.ACTIVE, LocalizationEvent.LOCALE_ENABLED, reason ?? 'Enabled', actorId);
  }

  async disableLocale(code: string, userRole: string, actorId: string, reason?: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);
    if (locale.isDefault) {
      throw new LocalizationAccessDeniedException();
    }
    return this.transitionLocale(locale, LocaleStatus.DISABLED, LocalizationEvent.LOCALE_DISABLED, reason ?? 'Disabled', actorId);
  }

  async archiveLocale(code: string, userRole: string, actorId: string, reason?: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);
    if (locale.isDefault) {
      throw new LocalizationAccessDeniedException();
    }
    return this.transitionLocale(locale, LocaleStatus.ARCHIVED, LocalizationEvent.LOCALE_ARCHIVED, reason ?? 'Archived', actorId);
  }

  async restoreLocale(code: string, userRole: string, actorId: string, reason?: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    return this.transitionLocale(await this.getLocaleOrThrow(code), LocaleStatus.ACTIVE, LocalizationEvent.LOCALE_RESTORED, reason ?? 'Restored', actorId);
  }

  async getLocaleHistory(code: string): Promise<ILocaleDefinitionHistory[]> {
    const locale = await this.getLocaleOrThrow(code);
    return this.repository.listLocaleHistory(locale.id);
  }

  /** Search/filter/sort/paginate the locale catalog. */
  async findLocales(filter: LocaleFilterDto): Promise<PaginatedLocaleResponseDto> {
    const [data, total] = await this.repository.findLocales(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async setDefaultLocale(code: string, userRole: string, actorId: string): Promise<ILocaleDefinition> {
    this.assertCanManage(userRole);
    const locale = await this.getLocaleOrThrow(code);

    await this.repository.clearDefaultLocale();
    const updated = await this.repository.updateLocale(locale.id, {
      isDefault: true,
      isActive: true,
      status: LocaleStatus.ACTIVE,
    } as Partial<ILocaleDefinition>);

    await this.recordLocaleHistory(updated, 'Set as default', actorId);
    this.cache.invalidateExact(ACTIVE_LOCALES_CACHE_KEY);
    await this.publishEvent(LocalizationEvent.DEFAULT_LOCALE_CHANGED, { localeCode: code, actorId });
    return updated;
  }

  /**
   * Runtime locale switching — validates the target locale exists, then
   * writes the switch through the *existing* precedence tier it belongs to
   * (User Preferences for a personal switch, Organization Settings at
   * WORKSPACE or ORGANIZATION scope for a shared default). Never stores a
   * parallel locale-preference row of its own.
   */
  async switchLocale(
    workspaceId: string,
    userId: string,
    userRole: string,
    localeCode: string,
    scope: 'USER' | 'WORKSPACE' | 'ORGANIZATION' = 'USER',
  ): Promise<{ localeCode: string; scope: string }> {
    await this.getLocaleOrThrow(localeCode);

    if (scope === 'USER') {
      await this.userPreferencesService.updateCategory(workspaceId, userId, userRole, UserPreferencesCategory.DISPLAY, {
        language: localeCode,
      });
    } else {
      await this.organizationSettingsService.updateCategory(
        workspaceId,
        userId,
        userRole,
        OrganizationSettingsCategory.REGIONAL,
        { locale: localeCode },
        scope === 'ORGANIZATION' ? SettingScope.ORGANIZATION : SettingScope.WORKSPACE,
      );
    }

    return { localeCode, scope };
  }

  /** Which language codes are enabled at all for an organization/workspace — an ORGANIZATION+WORKSPACE-scope setting, resolved through the existing precedence. */
  async getEnabledLanguages(workspaceId: string, userId: string): Promise<string[]> {
    const resolved = await this.organizationSettingsService.resolveKey(workspaceId, userId, ORG_ENABLED_LANGUAGES_SETTING_KEY);
    return Array.isArray(resolved.value) ? (resolved.value as string[]) : [];
  }

  async setEnabledLanguages(
    workspaceId: string,
    userId: string,
    userRole: string,
    localeCodes: string[],
    scope: 'WORKSPACE' | 'ORGANIZATION' = 'WORKSPACE',
  ): Promise<void> {
    for (const code of localeCodes) {
      await this.getLocaleOrThrow(code);
    }
    await this.organizationSettingsService.updateCategory(
      workspaceId,
      userId,
      userRole,
      OrganizationSettingsCategory.REGIONAL,
      { enabledLanguages: localeCodes },
      scope === 'ORGANIZATION' ? SettingScope.ORGANIZATION : SettingScope.WORKSPACE,
    );
  }

  /** Which languages a user prefers, in priority order — a USER-scope preference. */
  async getPreferredLanguages(workspaceId: string, userId: string): Promise<string[]> {
    const resolved = await this.userPreferencesService.resolveKey(workspaceId, userId, USER_PREFERRED_LANGUAGES_SETTING_KEY);
    return Array.isArray(resolved.value) ? (resolved.value as string[]) : [];
  }

  async setPreferredLanguages(workspaceId: string, userId: string, userRole: string, localeCodes: string[]): Promise<void> {
    for (const code of localeCodes) {
      await this.getLocaleOrThrow(code);
    }
    await this.userPreferencesService.updateCategory(workspaceId, userId, userRole, UserPreferencesCategory.DISPLAY, {
      preferredLanguages: localeCodes,
    });
  }

  // ── Language activation by country/marketplace/tenant ─────────────

  async setLocaleAvailability(
    userRole: string,
    actorId: string,
    dto: SetLocaleAvailabilityDto,
  ): Promise<ILocaleAvailability> {
    this.assertCanManage(userRole);
    await this.getLocaleOrThrow(dto.localeCode);

    const workspaceId = dto.workspaceId ?? null;
    const countryCode = dto.countryCode ?? null;
    const marketplaceKey = dto.marketplaceKey ?? null;
    const existing = await this.repository.findAvailability(dto.localeCode, workspaceId, countryCode, marketplaceKey);

    const availability = existing
      ? await this.repository.updateAvailability(existing.id, {
          isEnabled: dto.isEnabled ?? existing.isEnabled,
          isDefault: dto.isDefault ?? existing.isDefault,
          isPreferred: dto.isPreferred ?? existing.isPreferred,
        })
      : await this.repository.createAvailability({
          localeCode: dto.localeCode,
          workspaceId,
          countryCode,
          marketplaceKey,
          isEnabled: dto.isEnabled ?? true,
          isDefault: dto.isDefault ?? false,
          isPreferred: dto.isPreferred ?? false,
          metadata: {},
          createdBy: actorId,
        });

    await this.publishEvent(LocalizationEvent.LOCALE_AVAILABILITY_SET, {
      workspaceId,
      localeCode: dto.localeCode,
      marketplaceKey: dto.marketplaceKey,
      actorId,
      metadata: { countryCode, isEnabled: availability.isEnabled },
    });
    return availability;
  }

  async listLocaleAvailability(localeCode?: string, workspaceId?: string | null): Promise<ILocaleAvailability[]> {
    return this.repository.listAvailability(localeCode, workspaceId);
  }

  /** The locale codes activated for this context — global rows plus every progressively narrower workspace/country/marketplace match. */
  async listAvailableLocales(
    workspaceId: string,
    countryCode?: string | null,
    marketplaceKey?: string | null,
  ): Promise<string[]> {
    const rows = await this.repository.findApplicableAvailability(workspaceId, countryCode, marketplaceKey);
    return [...new Set(rows.filter((row) => row.isEnabled).map((row) => row.localeCode))];
  }

  async listLocales(activeOnly = false): Promise<ILocaleDefinition[]> {
    if (!activeOnly) {
      return this.repository.listLocales(false);
    }

    const cached = this.cache.get<ILocaleDefinition[]>(ACTIVE_LOCALES_CACHE_KEY);
    if (cached !== undefined) {
      return cached;
    }

    const active = await this.repository.listLocales(true);
    this.cache.set(ACTIVE_LOCALES_CACHE_KEY, active);
    return active;
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

  /**
   * Pluralized translation — resolves the CLDR plural category for `count` in `localeCode`
   * via `Intl.PluralRules` (e.g. "one"/"other" for English, "zero"/"one"/"two"/"few"/"many"/"other"
   * for Arabic) and looks up `${key}_${category}` first, falling back to the bare `key` (the
   * implicit "other" form) when no category-specific translation was registered.
   */
  async translatePlural(
    namespaceKey: string,
    key: string,
    count: number,
    localeCode: string,
    params?: Record<string, string | number>,
  ): Promise<string> {
    const category = new Intl.PluralRules(localeCode).select(count);
    const namespace = await this.repository.findNamespaceByKey(namespaceKey);

    let effectiveKey = key;
    if (namespace) {
      const pluralKey = `${key}_${category}`;
      const pluralKeyEntity = await this.repository.findKeyByNamespaceAndKey(namespace.id, pluralKey);
      if (pluralKeyEntity) {
        effectiveKey = pluralKey;
      }
    }

    return this.translate(namespaceKey, effectiveKey, localeCode, { ...params, count });
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

  /** A translation is outdated when its source key's default text changed after the translation was last written. */
  async findOutdatedTranslations(namespaceKey: string, localeCode: string): Promise<string[]> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const [allKeys, existing] = await Promise.all([
      this.repository.listKeys(namespace.id),
      this.repository.listTranslationsForNamespace(namespace.id, localeCode),
    ]);

    const translationByKey = new Map(existing.map((row) => [row.key, row]));
    return allKeys
      .filter((k) => {
        const translation = translationByKey.get(k.key);
        return !!translation && translation.updatedAt < k.updatedAt;
      })
      .map((k) => k.key);
  }

  /** A translation conflicts with its source when their `{{token}}` interpolation placeholders don't match — a strong signal the translation is stale or broken. */
  async findConflictingTranslations(namespaceKey: string, localeCode: string): Promise<string[]> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const [allKeys, existing] = await Promise.all([
      this.repository.listKeys(namespace.id),
      this.repository.listTranslationsForNamespace(namespace.id, localeCode),
    ]);

    const keyByName = new Map(allKeys.map((k) => [k.key, k]));
    const conflicting: string[] = [];
    for (const translation of existing) {
      const keyEntity = keyByName.get(translation.key);
      if (!keyEntity?.defaultValue) {
        continue;
      }
      const sourceTokens = this.extractInterpolationTokens(keyEntity.defaultValue);
      const translatedTokens = this.extractInterpolationTokens(translation.value);
      const mismatched =
        [...sourceTokens].some((t) => !translatedTokens.has(t)) || [...translatedTokens].some((t) => !sourceTokens.has(t));
      if (mismatched) {
        conflicting.push(translation.key);
      }
    }
    return conflicting;
  }

  async detectTranslationIssues(namespaceKey: string, localeCode: string): Promise<ITranslationIssue[]> {
    const [missing, outdated, conflicting] = await Promise.all([
      this.findMissingKeys(namespaceKey, localeCode),
      this.findOutdatedTranslations(namespaceKey, localeCode),
      this.findConflictingTranslations(namespaceKey, localeCode),
    ]);

    const issues: ITranslationIssue[] = [];
    for (const key of missing) {
      issues.push({
        type: TranslationIssueType.MISSING,
        namespaceKey,
        key,
        localeCode,
        message: `No translation for '${key}' in '${localeCode}'`,
      });
    }
    for (const key of outdated) {
      issues.push({
        type: TranslationIssueType.OUTDATED,
        namespaceKey,
        key,
        localeCode,
        message: `Translation for '${key}' predates the source key's last update`,
      });
    }
    for (const key of conflicting) {
      issues.push({
        type: TranslationIssueType.CONFLICTING,
        namespaceKey,
        key,
        localeCode,
        message: `Translation for '${key}' has interpolation placeholders that don't match its source`,
      });
    }
    return issues;
  }

  /** Translation completeness for a locale within a namespace — reuses the existing key/translation lookups rather than a second aggregation store. */
  async getTranslationCompleteness(namespaceKey: string, localeCode: string): Promise<ITranslationCompleteness> {
    const namespace = await this.getNamespaceOrThrow(namespaceKey);
    const [allKeys, existing] = await Promise.all([
      this.repository.listKeys(namespace.id),
      this.repository.listTranslationsForNamespace(namespace.id, localeCode),
    ]);

    const totalKeys = allKeys.length;
    const translatedKeys = new Set(existing.map((row) => row.key)).size;
    const missingKeys = Math.max(totalKeys - translatedKeys, 0);
    const completenessPercent = totalKeys === 0 ? 100 : Math.round((translatedKeys / totalKeys) * 100);

    return { namespaceKey, localeCode, totalKeys, translatedKeys, missingKeys, completenessPercent };
  }

  // ── Marketplace/provider locale requirements ──────────────────────

  async setProviderRequirement(
    userRole: string,
    actorId: string,
    dto: SetProviderRequirementDto,
  ): Promise<ILocaleProviderRequirement> {
    this.assertCanManage(userRole);
    await this.getLocaleOrThrow(dto.requiredLocaleCode);

    const workspaceId = dto.workspaceId ?? null;
    const countryCode = dto.countryCode ?? null;
    const existing = await this.repository.findProviderRequirement(workspaceId, dto.marketplaceKey, countryCode);

    const requirement = existing
      ? await this.repository.updateProviderRequirement(existing.id, {
          requiredLocaleCode: dto.requiredLocaleCode,
          requiredCurrencyCode: dto.requiredCurrencyCode ?? null,
          requiredTimezone: dto.requiredTimezone ?? null,
          requiredMeasurementSystem: dto.requiredMeasurementSystem ?? null,
        })
      : await this.repository.createProviderRequirement({
          workspaceId,
          marketplaceKey: dto.marketplaceKey,
          countryCode,
          requiredLocaleCode: dto.requiredLocaleCode,
          requiredCurrencyCode: dto.requiredCurrencyCode ?? null,
          requiredTimezone: dto.requiredTimezone ?? null,
          requiredMeasurementSystem: dto.requiredMeasurementSystem ?? null,
          metadata: {},
          createdBy: actorId,
        });

    this.cache.invalidateProviderRequirements(dto.marketplaceKey);
    await this.publishEvent(LocalizationEvent.PROVIDER_REQUIREMENT_SET, {
      workspaceId,
      marketplaceKey: dto.marketplaceKey,
      actorId,
      metadata: { countryCode, requiredLocaleCode: dto.requiredLocaleCode },
    });
    return requirement;
  }

  /** Prefers a workspace-scoped requirement over the global default for the same marketplace + country — cached, event-invalidated. */
  async getProviderRequirement(
    workspaceId: string,
    marketplaceKey: string,
    countryCode?: string,
  ): Promise<ILocaleProviderRequirement | null> {
    const cacheKey = this.cache.buildProviderRequirementKey(workspaceId, marketplaceKey, countryCode);
    const cached = this.cache.get<ILocaleProviderRequirement | null>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const resolved = await this.repository.resolveProviderRequirement(workspaceId, marketplaceKey, countryCode ?? null);
    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  async listProviderRequirements(marketplaceKey?: string, workspaceId?: string | null): Promise<ILocaleProviderRequirement[]> {
    return this.repository.listProviderRequirements(marketplaceKey, workspaceId);
  }

  // ── Effective locale / regional settings (resolves through Organization Settings / User Preferences) ──

  /**
   * Resolves a single regional dimension through the *same* global→organization→workspace→user
   * precedence already enforced by the Settings Framework: `SettingsService.resolve()` ranks every
   * candidate (GLOBAL default, ORGANIZATION, WORKSPACE, USER) by `SETTING_SCOPE_PRECEDENCE` and
   * returns the most specific one, so a WORKSPACE-scoped override on the organization-settings key
   * already wins over an ORGANIZATION-scoped one — this helper just reports which tier actually won
   * (a workspace override was previously mislabeled as 'ORGANIZATION'; now it reports the real source).
   */
  private async resolveRegionalDimension(
    workspaceId: string,
    userId: string,
    userSettingKey: string,
    orgSettingKey: string,
  ): Promise<{ value: string | null; source: string }> {
    const userResolved = await this.userPreferencesService.resolveKey(workspaceId, userId, userSettingKey);
    if (userResolved.source !== 'DEFAULT' && typeof userResolved.value === 'string' && userResolved.value) {
      return { value: userResolved.value, source: 'USER' };
    }

    const orgResolved = await this.organizationSettingsService.resolveKey(workspaceId, userId, orgSettingKey);
    if (orgResolved.source !== 'DEFAULT' && typeof orgResolved.value === 'string' && orgResolved.value) {
      return { value: orgResolved.value, source: String(orgResolved.source) };
    }

    return { value: null, source: 'DEFAULT' };
  }

  async resolveEffectiveLocale(workspaceId: string, userId: string): Promise<{ localeCode: string; source: string }> {
    const resolved = await this.resolveRegionalDimension(workspaceId, userId, USER_LOCALE_SETTING_KEY, ORG_LOCALE_SETTING_KEY);
    if (resolved.value) {
      return { localeCode: resolved.value, source: resolved.source };
    }

    const defaultLocale = await this.repository.findDefaultLocale();
    return { localeCode: defaultLocale?.code ?? DEFAULT_FALLBACK_LOCALE, source: 'SYSTEM_DEFAULT' };
  }

  /** All localization dimensions resolved together — locale, timezone, currency, date/number format and measurement system. */
  async resolveEffectiveRegionalSettings(workspaceId: string, userId: string): Promise<IEffectiveRegionalSettings> {
    const [locale, timezone, currency, dateFormat, numberFormat, measurementSystem] = await Promise.all([
      this.resolveRegionalDimension(workspaceId, userId, USER_LOCALE_SETTING_KEY, ORG_LOCALE_SETTING_KEY),
      this.resolveRegionalDimension(workspaceId, userId, USER_TIMEZONE_SETTING_KEY, ORG_TIMEZONE_SETTING_KEY),
      this.resolveRegionalDimension(workspaceId, userId, USER_CURRENCY_SETTING_KEY, ORG_CURRENCY_SETTING_KEY),
      this.resolveRegionalDimension(workspaceId, userId, USER_DATE_FORMAT_SETTING_KEY, ORG_DATE_FORMAT_SETTING_KEY),
      this.resolveRegionalDimension(workspaceId, userId, USER_NUMBER_FORMAT_SETTING_KEY, ORG_NUMBER_FORMAT_SETTING_KEY),
      this.resolveRegionalDimension(workspaceId, userId, USER_MEASUREMENT_SYSTEM_SETTING_KEY, ORG_MEASUREMENT_SYSTEM_SETTING_KEY),
    ]);

    const defaultLocale = await this.repository.findDefaultLocale();
    const localeDef = locale.value ? await this.repository.findLocaleByCode(locale.value) : null;
    const fallbackLocaleDef = localeDef ?? defaultLocale;
    const localeTierSource = fallbackLocaleDef ? 'LOCALE_DEFAULT' : 'SYSTEM_DEFAULT';

    return {
      localeCode: locale.value ?? fallbackLocaleDef?.code ?? DEFAULT_FALLBACK_LOCALE,
      localeSource: locale.value ? locale.source : 'SYSTEM_DEFAULT',
      timezone: timezone.value ?? fallbackLocaleDef?.timezone ?? DEFAULT_FALLBACK_TIMEZONE,
      timezoneSource: timezone.value ? timezone.source : localeTierSource,
      currencyCode: currency.value ?? fallbackLocaleDef?.currencyCode ?? 'USD',
      currencySource: currency.value ? currency.source : localeTierSource,
      dateFormat: dateFormat.value ?? fallbackLocaleDef?.dateFormat ?? 'YYYY-MM-DD',
      dateFormatSource: dateFormat.value ? dateFormat.source : localeTierSource,
      numberFormat: numberFormat.value ?? DEFAULT_FALLBACK_LOCALE,
      numberFormatSource: numberFormat.value ? numberFormat.source : 'SYSTEM_DEFAULT',
      measurementSystem: (measurementSystem.value as MeasurementSystem | null) ?? fallbackLocaleDef?.measurementSystem ?? DEFAULT_FALLBACK_MEASUREMENT_SYSTEM,
      measurementSystemSource: measurementSystem.value ? measurementSystem.source : localeTierSource,
    };
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

    const localeDef = await this.repository.findLocaleByCode(localeCode);
    if (localeDef?.fallbackLocaleCode && localeDef.fallbackLocaleCode !== localeCode) {
      const explicitFallbackMatch = await this.repository.findTranslation(keyEntity.id, localeDef.fallbackLocaleCode);
      if (explicitFallbackMatch && explicitFallbackMatch.status === TranslationStatus.PUBLISHED) {
        return explicitFallbackMatch.value;
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

  private extractInterpolationTokens(text: string): Set<string> {
    const tokens = new Set<string>();
    for (const match of text.matchAll(INTERPOLATION_PATTERN)) {
      tokens.add(match[1]);
    }
    return tokens;
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

  /** A registered target that exists, and doesn't close a fallback cycle back to `code`. */
  private async assertValidFallback(code: string, fallbackLocaleCode: string): Promise<void> {
    if (fallbackLocaleCode === code) {
      throw new FallbackLocaleCycleException(code, fallbackLocaleCode);
    }

    let current: string | null = fallbackLocaleCode;
    for (let hop = 0; current && hop < LOCALE_FALLBACK_MAX_DEPTH; hop += 1) {
      const target: ILocaleDefinition | null = await this.repository.findLocaleByCode(current);
      if (!target) {
        throw new InvalidFallbackLocaleException(current);
      }
      if (target.fallbackLocaleCode === code) {
        throw new FallbackLocaleCycleException(code, fallbackLocaleCode);
      }
      current = target.fallbackLocaleCode ?? null;
    }
  }

  private assertLocaleTransition(from: LocaleStatus, to: LocaleStatus): void {
    if (!LOCALE_ALLOWED_TRANSITIONS[from]?.includes(to)) {
      throw new LocaleInvalidStateTransitionException(from, to);
    }
  }

  private async transitionLocale(
    locale: ILocaleDefinition,
    to: LocaleStatus,
    event: LocalizationEvent,
    reason: string,
    actorId: string,
  ): Promise<ILocaleDefinition> {
    this.assertLocaleTransition(locale.status, to);

    const updated = await this.repository.updateLocale(locale.id, {
      status: to,
      isActive: to === LocaleStatus.ACTIVE,
      version: locale.version + 1,
    } as Partial<ILocaleDefinition>);

    await this.recordLocaleHistory(updated, reason, actorId);
    this.cache.invalidateExact(ACTIVE_LOCALES_CACHE_KEY);
    await this.publishEvent(event, { localeCode: updated.code, actorId });
    return updated;
  }

  private async recordLocaleHistory(locale: ILocaleDefinition, changeReason: string, changedBy?: string): Promise<void> {
    try {
      await this.repository.createLocaleHistory({
        localeId: locale.id,
        version: locale.version,
        status: locale.status,
        snapshot: { ...locale },
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Failed to write locale history for '${locale.code}': ${(err as Error).message}`);
    }
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
    opts: {
      localeCode?: string;
      namespaceKey?: string;
      key?: string;
      workspaceId?: string | null;
      marketplaceKey?: string;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
