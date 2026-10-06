import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { LocalizationService } from './localization.service';
import {
  CreateLocaleDto,
  UpdateLocaleDto,
  LocaleFilterDto,
  LocaleReasonDto,
  SetEnabledLanguagesDto,
  SetPreferredLanguagesDto,
  CreateNamespaceDto,
  CreateTranslationKeyDto,
  SetTranslationDto,
  ImportTranslationsDto,
  TranslateDto,
  TranslatePluralDto,
  SwitchLocaleDto,
  FormatDateDto,
  FormatNumberDto,
  FormatCurrencyDto,
  ParseNumberDto,
  SortLocaleAwareDto,
  SetProviderRequirementDto,
  SetLocaleAvailabilityDto,
  LocaleResponseDto,
  PaginatedLocaleResponseDto,
  LocaleHistoryResponseDto,
  LocaleAvailabilityResponseDto,
  TranslationNamespaceResponseDto,
  TranslationKeyResponseDto,
  TranslationResponseDto,
  TranslationHistoryResponseDto,
  TranslationCompletenessResponseDto,
  EffectiveLocaleResponseDto,
  EffectiveRegionalSettingsResponseDto,
  LocaleProviderRequirementResponseDto,
  TranslationIssueResponseDto,
} from './dto';

@Controller({ path: 'localization', version: '1' })
export class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  // ── Effective locale (resolves through Organization Settings / User Preferences) ──

  @Get('effective-locale')
  async resolveEffectiveLocale(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<EffectiveLocaleResponseDto> {
    return this.localizationService.resolveEffectiveLocale(workspaceId, userId);
  }

  @Get('effective-regional-settings')
  async resolveEffectiveRegionalSettings(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<EffectiveRegionalSettingsResponseDto> {
    return this.localizationService.resolveEffectiveRegionalSettings(workspaceId, userId);
  }

  @Post('switch-locale')
  async switchLocale(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SwitchLocaleDto,
  ): Promise<{ localeCode: string; scope: string }> {
    return this.localizationService.switchLocale(workspaceId, userId, userRole, dto.localeCode, dto.scope);
  }

  // ── Locales ──────────────────────────────────────────────────────

  @Post('locales')
  @HttpCode(HttpStatus.CREATED)
  async createLocale(
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: CreateLocaleDto,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.createLocale(userRole, userId, dto)) as unknown as LocaleResponseDto;
  }

  @Get('locales')
  async listLocales(@Query('activeOnly') activeOnly?: string): Promise<LocaleResponseDto[]> {
    return (await this.localizationService.listLocales(activeOnly === 'true')) as unknown as LocaleResponseDto[];
  }

  // Must precede 'locales/:code' — both are GET with one path segment after 'locales', and a literal
  // segment ('search') is only guaranteed to win over a param placeholder when declared first.
  @Get('locales/search')
  async findLocales(@Query() filter: LocaleFilterDto): Promise<PaginatedLocaleResponseDto> {
    return this.localizationService.findLocales(filter);
  }

  @Get('locales/:code')
  async getLocale(@Param('code') code: string): Promise<LocaleResponseDto> {
    return (await this.localizationService.getLocale(code)) as unknown as LocaleResponseDto;
  }

  @Get('locales/:code/history')
  async getLocaleHistory(@Param('code') code: string): Promise<LocaleHistoryResponseDto[]> {
    return (await this.localizationService.getLocaleHistory(code)) as unknown as LocaleHistoryResponseDto[];
  }

  @Patch('locales/:code')
  async updateLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: UpdateLocaleDto,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.updateLocale(code, userRole, userId, dto)) as unknown as LocaleResponseDto;
  }

  @Post('locales/:code/enable')
  async enableLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: LocaleReasonDto,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.enableLocale(code, userRole, userId, dto.reason)) as unknown as LocaleResponseDto;
  }

  @Post('locales/:code/disable')
  async disableLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: LocaleReasonDto,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.disableLocale(code, userRole, userId, dto.reason)) as unknown as LocaleResponseDto;
  }

  @Post('locales/:code/archive')
  async archiveLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: LocaleReasonDto,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.archiveLocale(code, userRole, userId, dto.reason)) as unknown as LocaleResponseDto;
  }

  @Post('locales/:code/restore')
  async restoreLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: LocaleReasonDto,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.restoreLocale(code, userRole, userId, dto.reason)) as unknown as LocaleResponseDto;
  }

  @Post('locales/:code/set-default')
  async setDefaultLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.setDefaultLocale(code, userRole, userId)) as unknown as LocaleResponseDto;
  }

  // ── Enabled / preferred languages (org/workspace/user precedence) ──

  @Get('languages/enabled')
  async getEnabledLanguages(@WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<{ localeCodes: string[] }> {
    return { localeCodes: await this.localizationService.getEnabledLanguages(workspaceId, userId) };
  }

  @Post('languages/enabled')
  async setEnabledLanguages(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SetEnabledLanguagesDto,
  ): Promise<{ localeCodes: string[] }> {
    await this.localizationService.setEnabledLanguages(workspaceId, userId, userRole, dto.localeCodes, dto.scope);
    return { localeCodes: dto.localeCodes };
  }

  @Get('languages/preferred')
  async getPreferredLanguages(@WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<{ localeCodes: string[] }> {
    return { localeCodes: await this.localizationService.getPreferredLanguages(workspaceId, userId) };
  }

  @Post('languages/preferred')
  async setPreferredLanguages(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SetPreferredLanguagesDto,
  ): Promise<{ localeCodes: string[] }> {
    await this.localizationService.setPreferredLanguages(workspaceId, userId, userRole, dto.localeCodes);
    return { localeCodes: dto.localeCodes };
  }

  // ── Language activation by country/marketplace/tenant ─────────────

  @Post('locale-availability')
  @HttpCode(HttpStatus.CREATED)
  async setLocaleAvailability(
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: SetLocaleAvailabilityDto,
  ): Promise<LocaleAvailabilityResponseDto> {
    return (await this.localizationService.setLocaleAvailability(
      userRole,
      userId,
      dto,
    )) as unknown as LocaleAvailabilityResponseDto;
  }

  @Get('locale-availability')
  async listLocaleAvailability(
    @Query('localeCode') localeCode?: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<LocaleAvailabilityResponseDto[]> {
    return (await this.localizationService.listLocaleAvailability(
      localeCode,
      workspaceId,
    )) as unknown as LocaleAvailabilityResponseDto[];
  }

  @Get('locale-availability/resolve')
  async listAvailableLocales(
    @WorkspaceId() workspaceId: string,
    @Query('countryCode') countryCode?: string,
    @Query('marketplaceKey') marketplaceKey?: string,
  ): Promise<{ localeCodes: string[] }> {
    return { localeCodes: await this.localizationService.listAvailableLocales(workspaceId, countryCode, marketplaceKey) };
  }

  // ── Namespaces & keys ────────────────────────────────────────────

  @Post('namespaces')
  @HttpCode(HttpStatus.CREATED)
  async createNamespace(
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: CreateNamespaceDto,
  ): Promise<TranslationNamespaceResponseDto> {
    return (await this.localizationService.createNamespace(
      userRole,
      userId,
      dto,
    )) as unknown as TranslationNamespaceResponseDto;
  }

  @Get('namespaces')
  async listNamespaces(): Promise<TranslationNamespaceResponseDto[]> {
    return (await this.localizationService.listNamespaces()) as unknown as TranslationNamespaceResponseDto[];
  }

  @Get('namespaces/:namespaceKey')
  async getNamespace(@Param('namespaceKey') namespaceKey: string): Promise<TranslationNamespaceResponseDto> {
    return (await this.localizationService.getNamespace(namespaceKey)) as unknown as TranslationNamespaceResponseDto;
  }

  @Post('namespaces/:namespaceKey/keys')
  @HttpCode(HttpStatus.CREATED)
  async createKey(
    @Param('namespaceKey') namespaceKey: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: CreateTranslationKeyDto,
  ): Promise<TranslationKeyResponseDto> {
    return (await this.localizationService.createKey(
      namespaceKey,
      userRole,
      userId,
      dto,
    )) as unknown as TranslationKeyResponseDto;
  }

  @Get('namespaces/:namespaceKey/keys')
  async listKeys(@Param('namespaceKey') namespaceKey: string): Promise<TranslationKeyResponseDto[]> {
    return (await this.localizationService.listKeys(namespaceKey)) as unknown as TranslationKeyResponseDto[];
  }

  @Delete('namespaces/:namespaceKey/keys/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(
    @Param('namespaceKey') namespaceKey: string,
    @Param('key') key: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.localizationService.deleteKey(namespaceKey, key, userRole, userId);
  }

  // ── Missing-key detection ────────────────────────────────────────

  @Get('namespaces/:namespaceKey/missing/:localeCode')
  async findMissingKeys(
    @Param('namespaceKey') namespaceKey: string,
    @Param('localeCode') localeCode: string,
  ): Promise<{ namespaceKey: string; localeCode: string; missingKeys: string[] }> {
    const missingKeys = await this.localizationService.findMissingKeys(namespaceKey, localeCode);
    return { namespaceKey, localeCode, missingKeys };
  }

  // ── Import / export ──────────────────────────────────────────────

  @Get('namespaces/:namespaceKey/export/:localeCode')
  async exportNamespace(
    @Param('namespaceKey') namespaceKey: string,
    @Param('localeCode') localeCode: string,
  ): Promise<Record<string, string>> {
    return this.localizationService.exportNamespace(namespaceKey, localeCode);
  }

  @Post('namespaces/:namespaceKey/import/:localeCode')
  async importNamespace(
    @Param('namespaceKey') namespaceKey: string,
    @Param('localeCode') localeCode: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: ImportTranslationsDto,
  ): Promise<{ imported: number }> {
    return this.localizationService.importNamespace(namespaceKey, localeCode, userRole, userId, dto);
  }

  // ── Translations ─────────────────────────────────────────────────

  @Get('namespaces/:namespaceKey/keys/:key/history/:localeCode')
  async getTranslationHistory(
    @Param('namespaceKey') namespaceKey: string,
    @Param('key') key: string,
    @Param('localeCode') localeCode: string,
  ): Promise<TranslationHistoryResponseDto[]> {
    return (await this.localizationService.getTranslationHistory(
      namespaceKey,
      key,
      localeCode,
    )) as unknown as TranslationHistoryResponseDto[];
  }

  @Post('namespaces/:namespaceKey/keys/:key/translations/:localeCode')
  async setTranslation(
    @Param('namespaceKey') namespaceKey: string,
    @Param('key') key: string,
    @Param('localeCode') localeCode: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: SetTranslationDto,
  ): Promise<TranslationResponseDto> {
    return (await this.localizationService.setTranslation(
      namespaceKey,
      key,
      localeCode,
      userRole,
      userId,
      dto,
    )) as unknown as TranslationResponseDto;
  }

  @Post('namespaces/:namespaceKey/keys/:key/translate/:localeCode')
  async translate(
    @Param('namespaceKey') namespaceKey: string,
    @Param('key') key: string,
    @Param('localeCode') localeCode: string,
    @Body() dto: TranslateDto,
  ): Promise<{ value: string }> {
    const value = await this.localizationService.translate(namespaceKey, key, localeCode, dto.params);
    return { value };
  }

  @Get('namespaces/:namespaceKey/bundle/:localeCode')
  async bulkTranslate(
    @Param('namespaceKey') namespaceKey: string,
    @Param('localeCode') localeCode: string,
  ): Promise<Record<string, string>> {
    return this.localizationService.bulkTranslate(namespaceKey, localeCode);
  }

  @Post('namespaces/:namespaceKey/keys/:key/translate-plural/:localeCode')
  async translatePlural(
    @Param('namespaceKey') namespaceKey: string,
    @Param('key') key: string,
    @Param('localeCode') localeCode: string,
    @Body() dto: TranslatePluralDto,
  ): Promise<{ value: string }> {
    const value = await this.localizationService.translatePlural(namespaceKey, key, dto.count, localeCode, dto.params);
    return { value };
  }

  // ── Outdated / conflicting-translation detection ─────────────────

  @Get('namespaces/:namespaceKey/issues/:localeCode')
  async detectTranslationIssues(
    @Param('namespaceKey') namespaceKey: string,
    @Param('localeCode') localeCode: string,
  ): Promise<TranslationIssueResponseDto[]> {
    return (await this.localizationService.detectTranslationIssues(
      namespaceKey,
      localeCode,
    )) as unknown as TranslationIssueResponseDto[];
  }

  @Get('namespaces/:namespaceKey/completeness/:localeCode')
  async getTranslationCompleteness(
    @Param('namespaceKey') namespaceKey: string,
    @Param('localeCode') localeCode: string,
  ): Promise<TranslationCompletenessResponseDto> {
    return (await this.localizationService.getTranslationCompleteness(
      namespaceKey,
      localeCode,
    )) as unknown as TranslationCompletenessResponseDto;
  }

  // ── Marketplace/provider locale requirements ──────────────────────

  @Post('provider-requirements')
  @HttpCode(HttpStatus.CREATED)
  async setProviderRequirement(
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: SetProviderRequirementDto,
  ): Promise<LocaleProviderRequirementResponseDto> {
    return (await this.localizationService.setProviderRequirement(
      userRole,
      userId,
      dto,
    )) as unknown as LocaleProviderRequirementResponseDto;
  }

  @Get('provider-requirements')
  async listProviderRequirements(
    @Query('marketplaceKey') marketplaceKey?: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<LocaleProviderRequirementResponseDto[]> {
    return (await this.localizationService.listProviderRequirements(
      marketplaceKey,
      workspaceId,
    )) as unknown as LocaleProviderRequirementResponseDto[];
  }

  @Get('provider-requirements/:marketplaceKey')
  async getProviderRequirement(
    @Param('marketplaceKey') marketplaceKey: string,
    @WorkspaceId() workspaceId: string,
    @Query('countryCode') countryCode?: string,
  ): Promise<LocaleProviderRequirementResponseDto | null> {
    return (await this.localizationService.getProviderRequirement(
      workspaceId,
      marketplaceKey,
      countryCode,
    )) as unknown as LocaleProviderRequirementResponseDto | null;
  }

  // ── Locale-aware formatting / parsing / sorting ─────────────────

  @Post('format/date')
  async formatDate(@Body() dto: FormatDateDto): Promise<{ value: string }> {
    const value = await this.localizationService.formatDate(dto.date, dto.localeCode);
    return { value };
  }

  @Post('format/number')
  async formatNumber(@Body() dto: FormatNumberDto): Promise<{ value: string }> {
    const value = await this.localizationService.formatNumber(dto.value, dto.localeCode);
    return { value };
  }

  @Post('format/currency')
  async formatCurrency(@Body() dto: FormatCurrencyDto): Promise<{ value: string }> {
    const value = await this.localizationService.formatCurrency(dto.value, dto.localeCode, dto.currencyCode);
    return { value };
  }

  @Post('parse/number')
  async parseNumber(@Body() dto: ParseNumberDto): Promise<{ value: number }> {
    const value = await this.localizationService.parseNumber(dto.value, dto.localeCode);
    return { value };
  }

  @Post('sort')
  sortLocaleAware(@Body() dto: SortLocaleAwareDto): { items: string[] } {
    return { items: this.localizationService.sortLocaleAware(dto.items, dto.localeCode) };
  }
}
