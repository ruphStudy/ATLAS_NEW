import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { RegionalSettingsProfileFilterOptions } from '../interfaces';
import { REGIONAL_SETTINGS_CONSTANTS } from '../constants';

@Injectable()
export class RegionalSettingsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Internal Helpers ──────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Profile ─────────────────────────────────────────────────

  async createProfile(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('regionalSettingsProfile', 'create', { data });
  }

  async findProfileById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('regionalSettingsProfile', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async updateProfile(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('regionalSettingsProfile', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findProfiles(filter: RegionalSettingsProfileFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.key) where['key'] = filter.key;
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.scopeType) where['scopeType'] = filter.scopeType;
    if (filter.countryCode) where['countryCode'] = filter.countryCode.toUpperCase();
    if (filter.regionCode) where['regionCode'] = filter.regionCode.toUpperCase();
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        { key: { contains: filter.search, mode: 'insensitive' } },
        { countryCode: { contains: filter.search.toUpperCase() } },
      ];
    }

    const sortField = REGIONAL_SETTINGS_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'priority'] ?? 'priority';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const take = Math.min(filter.limit ?? REGIONAL_SETTINGS_CONSTANTS.DEFAULT_PAGE_SIZE, REGIONAL_SETTINGS_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('regionalSettingsProfile', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('regionalSettingsProfile', 'count', { where }),
    ]);
    return [items, total];
  }

  /** Any non-archived profile sharing the same key + exact scope combination — used to detect duplicates. */
  async findProfileByScope(
    key: string,
    workspaceId: string | null,
    organizationId: string | null,
    countryCode: string | null,
    regionCode: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('regionalSettingsProfile', 'findFirst', {
      where: {
        key,
        workspaceId,
        organizationId,
        countryCode,
        regionCode,
        status: { not: 'ARCHIVED' },
        deletedAt: null,
      },
    });
  }

  /**
   * Every currently-effective PUBLISHED profile whose scope could apply to
   * this context — global, plus progressively narrower country/region/
   * organization/workspace matches. Precedence among them is ranked by the
   * resolver, never by the repository.
   */
  async findApplicableProfiles(
    workspaceId: string,
    organizationId: string | null,
    countryCode: string | null,
    regionCode: string | null,
    effectiveDate: Date,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('regionalSettingsProfile', 'findMany', {
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        effectiveFrom: { lte: effectiveDate },
        AND: [
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }] },
          { OR: [{ workspaceId: null }, { workspaceId }] },
          { OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] },
          { OR: [{ countryCode: null }, ...(countryCode ? [{ countryCode: countryCode.toUpperCase() }] : [])] },
          { OR: [{ regionCode: null }, ...(regionCode ? [{ regionCode: regionCode.toUpperCase() }] : [])] },
        ],
      } as any,
      orderBy: { priority: 'desc' },
    });
  }

  // ── Profile History ────────────────────────────────────────

  async createProfileHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('regionalSettingsProfileHistory', 'create', { data });
  }

  async findProfileHistory(profileId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('regionalSettingsProfileHistory', 'findMany', {
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findProfileHistoryByVersion(profileId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('regionalSettingsProfileHistory', 'findFirst', {
      where: { profileId, version },
    });
  }
}
