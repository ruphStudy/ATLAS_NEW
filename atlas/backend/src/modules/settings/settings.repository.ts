import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ISettingDefinition,
  ISettingValue,
  ISettingValueHistory,
  SettingValueStatus,
} from './interfaces';
import { SettingDefinitionFilterDto, SettingValueFilterDto } from './dto';

@Injectable()
export class SettingsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Definitions ──────────────────────────────────────────────────

  async createDefinition(data: Partial<ISettingDefinition>): Promise<ISettingDefinition> {
    return this.prisma.settingDefinition.create({ data: data as any }) as Promise<ISettingDefinition>;
  }

  async findDefinitionByKey(key: string): Promise<ISettingDefinition | null> {
    return this.prisma.settingDefinition.findFirst({
      where: { key, deletedAt: null },
    }) as Promise<ISettingDefinition | null>;
  }

  async findDefinitionsByKeys(keys: string[]): Promise<ISettingDefinition[]> {
    return this.prisma.settingDefinition.findMany({
      where: { key: { in: keys }, deletedAt: null },
    }) as Promise<ISettingDefinition[]>;
  }

  async findAllDefinitions(
    filter: SettingDefinitionFilterDto,
  ): Promise<[ISettingDefinition[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.category) where.category = filter.category;
    if (filter.module) where.module = filter.module;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { key: { contains: filter.search, mode: 'insensitive' } },
        { label: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.settingDefinition.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.settingDefinition.count({ where: where as any }),
    ]);

    return [data as ISettingDefinition[], total];
  }

  async updateDefinition(key: string, data: Partial<ISettingDefinition>): Promise<ISettingDefinition> {
    return this.prisma.settingDefinition.update({
      where: { key },
      data: data as any,
    }) as Promise<ISettingDefinition>;
  }

  // ── Values ───────────────────────────────────────────────────────

  async createValue(data: Partial<ISettingValue>): Promise<ISettingValue> {
    return this.prisma.settingValue.create({ data: data as any }) as Promise<ISettingValue>;
  }

  async findValueById(id: string): Promise<ISettingValue | null> {
    return this.prisma.settingValue.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<ISettingValue | null>;
  }

  async findValueByScopeKey(definitionKey: string, scopeKey: string): Promise<ISettingValue | null> {
    return this.prisma.settingValue.findFirst({
      where: { definitionKey, scopeKey, deletedAt: null },
    }) as Promise<ISettingValue | null>;
  }

  async updateValue(id: string, data: Partial<ISettingValue>): Promise<ISettingValue> {
    return this.prisma.settingValue.update({
      where: { id },
      data: data as any,
    }) as Promise<ISettingValue>;
  }

  async findAll(workspaceId: string, filter: SettingValueFilterDto): Promise<[ISettingValue[], number]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ workspaceId }, { workspaceId: null }],
    };
    if (filter.definitionKey) where.definitionKey = filter.definitionKey;
    if (filter.scope) where.scope = filter.scope;
    if (filter.moduleKey) where.moduleKey = filter.moduleKey;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.settingValue.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.settingValue.count({ where: where as any }),
    ]);

    return [data as ISettingValue[], total];
  }

  /** Every PUBLISHED, currently-effective value across the scope tiers that apply to this context, for one definition. */
  async findResolutionCandidates(
    definitionKey: string,
    scopeKeys: string[],
    now: Date,
  ): Promise<ISettingValue[]> {
    return this.prisma.settingValue.findMany({
      where: {
        definitionKey,
        scopeKey: { in: scopeKeys },
        status: SettingValueStatus.PUBLISHED,
        deletedAt: null,
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
    }) as Promise<ISettingValue[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistoryEntry(data: Partial<ISettingValueHistory>): Promise<ISettingValueHistory> {
    return this.prisma.settingValueHistory.create({
      data: data as any,
    }) as Promise<ISettingValueHistory>;
  }

  async findHistory(settingValueId: string): Promise<ISettingValueHistory[]> {
    return this.prisma.settingValueHistory.findMany({
      where: { settingValueId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ISettingValueHistory[]>;
  }

  async findHistoryById(id: string): Promise<ISettingValueHistory | null> {
    return this.prisma.settingValueHistory.findFirst({ where: { id } }) as Promise<ISettingValueHistory | null>;
  }
}
