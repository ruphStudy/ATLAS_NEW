import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ITheme, IThemeHistory } from './interfaces';
import { ThemeFilterDto } from './dto';

@Injectable()
export class ThemeManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Themes ───────────────────────────────────────────────────────

  async create(data: Partial<ITheme>): Promise<ITheme> {
    return this.prisma.theme.create({ data: data as any }) as Promise<ITheme>;
  }

  async findById(id: string): Promise<ITheme | null> {
    return this.prisma.theme.findFirst({ where: { id, deletedAt: null } }) as Promise<ITheme | null>;
  }

  async findByScopeKeyAndKey(scopeKey: string, key: string): Promise<ITheme | null> {
    return this.prisma.theme.findFirst({
      where: { scopeKey, key, deletedAt: null },
    }) as Promise<ITheme | null>;
  }

  async findAll(visibleScopeKeys: string[], filter: ThemeFilterDto): Promise<[ITheme[], number]> {
    const where: Record<string, unknown> = { scopeKey: { in: visibleScopeKeys }, deletedAt: null };
    if (filter.scope) where.scope = filter.scope;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { key: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.theme.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.theme.count({ where: where as any }),
    ]);

    return [data as ITheme[], total];
  }

  async update(id: string, data: Partial<ITheme>): Promise<ITheme> {
    return this.prisma.theme.update({ where: { id }, data: data as any }) as Promise<ITheme>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IThemeHistory>): Promise<IThemeHistory> {
    return this.prisma.themeHistory.create({ data: data as any }) as Promise<IThemeHistory>;
  }

  async findHistory(themeId: string): Promise<IThemeHistory[]> {
    return this.prisma.themeHistory.findMany({
      where: { themeId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IThemeHistory[]>;
  }

  async findHistoryById(id: string): Promise<IThemeHistory | null> {
    return this.prisma.themeHistory.findFirst({ where: { id } }) as Promise<IThemeHistory | null>;
  }
}
