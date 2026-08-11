import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { LocalizationService } from './localization.service';
import {
  CreateLocaleDto,
  UpdateLocaleDto,
  CreateNamespaceDto,
  CreateTranslationKeyDto,
  SetTranslationDto,
  ImportTranslationsDto,
  TranslateDto,
  FormatDateDto,
  FormatNumberDto,
  FormatCurrencyDto,
  ParseNumberDto,
  SortLocaleAwareDto,
  LocaleResponseDto,
  TranslationNamespaceResponseDto,
  TranslationKeyResponseDto,
  TranslationResponseDto,
  TranslationHistoryResponseDto,
  EffectiveLocaleResponseDto,
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

  @Get('locales/:code')
  async getLocale(@Param('code') code: string): Promise<LocaleResponseDto> {
    return (await this.localizationService.getLocale(code)) as unknown as LocaleResponseDto;
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

  @Post('locales/:code/archive')
  async archiveLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.archiveLocale(code, userRole, userId)) as unknown as LocaleResponseDto;
  }

  @Post('locales/:code/set-default')
  async setDefaultLocale(
    @Param('code') code: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
  ): Promise<LocaleResponseDto> {
    return (await this.localizationService.setDefaultLocale(code, userRole, userId)) as unknown as LocaleResponseDto;
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
