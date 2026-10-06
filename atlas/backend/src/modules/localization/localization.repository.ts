import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ILocaleDefinition,
  ILocaleDefinitionHistory,
  ILocaleAvailability,
  ITranslationNamespace,
  ITranslationKey,
  ITranslation,
  ITranslationHistory,
  ILocaleProviderRequirement,
  LocaleFilterOptions,
} from './interfaces';

@Injectable()
export class LocalizationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Locales ──────────────────────────────────────────────────────

  async createLocale(data: Partial<ILocaleDefinition>): Promise<ILocaleDefinition> {
    return this.prisma.localeDefinition.create({ data: data as any }) as unknown as Promise<ILocaleDefinition>;
  }

  async findLocaleByCode(code: string): Promise<ILocaleDefinition | null> {
    return this.prisma.localeDefinition.findUnique({ where: { code } }) as Promise<ILocaleDefinition | null>;
  }

  async listLocales(activeOnly = false): Promise<ILocaleDefinition[]> {
    return this.prisma.localeDefinition.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { displayName: 'asc' },
    }) as unknown as Promise<ILocaleDefinition[]>;
  }

  async findDefaultLocale(): Promise<ILocaleDefinition | null> {
    return this.prisma.localeDefinition.findFirst({ where: { isDefault: true } }) as Promise<ILocaleDefinition | null>;
  }

  async updateLocale(id: string, data: Partial<ILocaleDefinition>): Promise<ILocaleDefinition> {
    return this.prisma.localeDefinition.update({ where: { id }, data: data as any }) as unknown as Promise<ILocaleDefinition>;
  }

  async clearDefaultLocale(): Promise<void> {
    await this.prisma.localeDefinition.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  async findLocales(filter: LocaleFilterOptions): Promise<[ILocaleDefinition[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.direction) where.direction = filter.direction;
    if (filter.language) where.language = filter.language;
    if (filter.country) where.country = filter.country;
    if (filter.script) where.script = filter.script;
    if (filter.search) {
      where.OR = [
        { code: { contains: filter.search, mode: 'insensitive' } },
        { displayName: { contains: filter.search, mode: 'insensitive' } },
        { nativeName: { contains: filter.search, mode: 'insensitive' } },
        { language: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'displayName';
    const sortOrder = filter.sortOrder ?? 'asc';

    const [data, total] = await Promise.all([
      this.prisma.localeDefinition.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.localeDefinition.count({ where: where as any }),
    ]);

    return [data as unknown as ILocaleDefinition[], total];
  }

  async createLocaleHistory(data: Partial<ILocaleDefinitionHistory>): Promise<ILocaleDefinitionHistory> {
    return this.prisma.localeDefinitionHistory.create({ data: data as any }) as Promise<ILocaleDefinitionHistory>;
  }

  async listLocaleHistory(localeId: string, limit = 20): Promise<ILocaleDefinitionHistory[]> {
    return this.prisma.localeDefinitionHistory.findMany({
      where: { localeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<ILocaleDefinitionHistory[]>;
  }

  // ── Namespaces ───────────────────────────────────────────────────

  async createNamespace(data: Partial<ITranslationNamespace>): Promise<ITranslationNamespace> {
    return this.prisma.translationNamespace.create({ data: data as any }) as Promise<ITranslationNamespace>;
  }

  async findNamespaceByKey(key: string): Promise<ITranslationNamespace | null> {
    return this.prisma.translationNamespace.findUnique({ where: { key } }) as Promise<ITranslationNamespace | null>;
  }

  async listNamespaces(): Promise<ITranslationNamespace[]> {
    return this.prisma.translationNamespace.findMany({ orderBy: { key: 'asc' } }) as Promise<ITranslationNamespace[]>;
  }

  // ── Keys ─────────────────────────────────────────────────────────

  async createKey(data: Partial<ITranslationKey>): Promise<ITranslationKey> {
    return this.prisma.translationKey.create({ data: data as any }) as Promise<ITranslationKey>;
  }

  async findKeyByNamespaceAndKey(namespaceId: string, key: string): Promise<ITranslationKey | null> {
    return this.prisma.translationKey.findUnique({
      where: { namespaceId_key: { namespaceId, key } },
    }) as Promise<ITranslationKey | null>;
  }

  async findKeyById(id: string): Promise<ITranslationKey | null> {
    return this.prisma.translationKey.findUnique({ where: { id } }) as Promise<ITranslationKey | null>;
  }

  async listKeys(namespaceId: string): Promise<ITranslationKey[]> {
    return this.prisma.translationKey.findMany({
      where: { namespaceId },
      orderBy: { key: 'asc' },
    }) as Promise<ITranslationKey[]>;
  }

  async deleteKey(id: string): Promise<void> {
    await this.prisma.translationKey.delete({ where: { id } });
  }

  // ── Translations ─────────────────────────────────────────────────

  async createTranslation(data: Partial<ITranslation>): Promise<ITranslation> {
    return this.prisma.translation.create({ data: data as any }) as Promise<ITranslation>;
  }

  async findTranslation(keyId: string, localeCode: string): Promise<ITranslation | null> {
    return this.prisma.translation.findUnique({
      where: { keyId_localeCode: { keyId, localeCode } },
    }) as Promise<ITranslation | null>;
  }

  async updateTranslation(id: string, data: Partial<ITranslation>): Promise<ITranslation> {
    return this.prisma.translation.update({ where: { id }, data: data as any }) as Promise<ITranslation>;
  }

  async listTranslationsForNamespace(namespaceId: string, localeCode: string): Promise<Array<ITranslation & { key: string }>> {
    const rows = await this.prisma.translation.findMany({
      where: { localeCode, key: { namespaceId } },
      include: { key: { select: { key: true } } },
    });
    return rows.map((row: any) => ({ ...row, key: row.key.key }));
  }

  async createTranslationHistory(data: Partial<ITranslationHistory>): Promise<ITranslationHistory> {
    return this.prisma.translationHistory.create({ data: data as any }) as Promise<ITranslationHistory>;
  }

  async listTranslationHistory(translationId: string): Promise<ITranslationHistory[]> {
    return this.prisma.translationHistory.findMany({
      where: { translationId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ITranslationHistory[]>;
  }

  // ── Marketplace/provider locale requirements ──────────────────────

  async createProviderRequirement(data: Partial<ILocaleProviderRequirement>): Promise<ILocaleProviderRequirement> {
    return this.prisma.localeProviderRequirement.create({ data: data as any }) as Promise<ILocaleProviderRequirement>;
  }

  async findProviderRequirement(
    workspaceId: string | null,
    marketplaceKey: string,
    countryCode: string | null,
  ): Promise<ILocaleProviderRequirement | null> {
    return this.prisma.localeProviderRequirement.findFirst({
      where: { workspaceId, marketplaceKey, countryCode, deletedAt: null },
    }) as Promise<ILocaleProviderRequirement | null>;
  }

  /** Prefers a workspace-scoped requirement over the global one for the same marketplace + country. */
  async resolveProviderRequirement(
    workspaceId: string,
    marketplaceKey: string,
    countryCode?: string | null,
  ): Promise<ILocaleProviderRequirement | null> {
    const scoped = await this.findProviderRequirement(workspaceId, marketplaceKey, countryCode ?? null);
    if (scoped) return scoped;
    return this.findProviderRequirement(null, marketplaceKey, countryCode ?? null);
  }

  async listProviderRequirements(marketplaceKey?: string, workspaceId?: string | null): Promise<ILocaleProviderRequirement[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (marketplaceKey) where.marketplaceKey = marketplaceKey;
    if (workspaceId !== undefined) where.workspaceId = workspaceId;
    return this.prisma.localeProviderRequirement.findMany({ where: where as any, orderBy: { marketplaceKey: 'asc' } }) as Promise<
      ILocaleProviderRequirement[]
    >;
  }

  async updateProviderRequirement(id: string, data: Partial<ILocaleProviderRequirement>): Promise<ILocaleProviderRequirement> {
    return this.prisma.localeProviderRequirement.update({
      where: { id },
      data: data as any,
    }) as Promise<ILocaleProviderRequirement>;
  }

  // ── Language activation by country/marketplace/tenant ─────────────

  async createAvailability(data: Partial<ILocaleAvailability>): Promise<ILocaleAvailability> {
    return this.prisma.localeAvailability.create({ data: data as any }) as Promise<ILocaleAvailability>;
  }

  async findAvailability(
    localeCode: string,
    workspaceId: string | null,
    countryCode: string | null,
    marketplaceKey: string | null,
  ): Promise<ILocaleAvailability | null> {
    return this.prisma.localeAvailability.findFirst({
      where: { localeCode, workspaceId, countryCode, marketplaceKey, deletedAt: null },
    }) as Promise<ILocaleAvailability | null>;
  }

  async updateAvailability(id: string, data: Partial<ILocaleAvailability>): Promise<ILocaleAvailability> {
    return this.prisma.localeAvailability.update({ where: { id }, data: data as any }) as Promise<ILocaleAvailability>;
  }

  async listAvailability(
    localeCode?: string,
    workspaceId?: string | null,
  ): Promise<ILocaleAvailability[]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (localeCode) where.localeCode = localeCode;
    if (workspaceId !== undefined) where.workspaceId = workspaceId;
    return this.prisma.localeAvailability.findMany({ where: where as any, orderBy: { localeCode: 'asc' } }) as Promise<
      ILocaleAvailability[]
    >;
  }

  /** Every non-deleted availability row whose scope could apply to this context (global + progressively narrower matches). */
  async findApplicableAvailability(
    workspaceId: string,
    countryCode?: string | null,
    marketplaceKey?: string | null,
  ): Promise<ILocaleAvailability[]> {
    return this.prisma.localeAvailability.findMany({
      where: {
        deletedAt: null,
        AND: [
          { OR: [{ workspaceId }, { workspaceId: null }] },
          { OR: [{ countryCode: countryCode ?? null }, { countryCode: null }] },
          { OR: [{ marketplaceKey: marketplaceKey ?? null }, { marketplaceKey: null }] },
        ],
      } as any,
    }) as Promise<ILocaleAvailability[]>;
  }
}
