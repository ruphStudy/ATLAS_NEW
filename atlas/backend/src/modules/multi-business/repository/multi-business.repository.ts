import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { BusinessEntityLinkFilterOptions, BusinessFilterOptions } from '../interfaces';
import { MULTI_BUSINESS_CONSTANTS } from '../constants';

@Injectable()
export class MultiBusinessRepository extends BaseRepository {
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

  // ── Business ────────────────────────────────────────────────

  async createBusiness(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('business', 'create', { data });
  }

  async findBusinessById(id: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('business', 'findFirst', {
      where: { id, deletedAt: null, ...(workspaceId ? { workspaceId } : {}) },
    });
  }

  async findBusinessByCode(workspaceId: string, code: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('business', 'findFirst', {
      where: { workspaceId, code, deletedAt: null },
    });
  }

  async findDefaultBusiness(workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('business', 'findFirst', {
      where: { workspaceId, isDefault: true, deletedAt: null },
    });
  }

  async clearDefaultBusiness(workspaceId: string): Promise<void> {
    await this.call('business', 'updateMany', {
      where: { workspaceId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  /** Any non-archived business sharing the same organization + registration/tax identifier — used to detect duplicate legal identities. */
  async findBusinessByLegalIdentity(
    organizationId: string | null,
    workspaceId: string,
    registrationNumber: string | null,
    taxIdentifier: string | null,
    excludeId?: string,
  ): Promise<Record<string, unknown> | null> {
    if (!registrationNumber && !taxIdentifier) return null;
    return this.call<Record<string, unknown> | null>('business', 'findFirst', {
      where: {
        deletedAt: null,
        status: { not: 'ARCHIVED' },
        ...(organizationId ? { organizationId } : { workspaceId }),
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          ...(registrationNumber ? [{ registrationNumber }] : []),
          ...(taxIdentifier ? [{ taxIdentifier }] : []),
        ],
      },
    });
  }

  async updateBusiness(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('business', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findBusinesses(filter: BusinessFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.parentBusinessId !== undefined) where['parentBusinessId'] = filter.parentBusinessId;
    if (filter.code) where['code'] = filter.code;
    if (filter.status) where['status'] = filter.status;
    if (filter.countryCode) where['countryCode'] = filter.countryCode.toUpperCase();
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { legalName: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = MULTI_BUSINESS_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'priority'] ?? 'priority';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const take = Math.min(filter.limit ?? MULTI_BUSINESS_CONSTANTS.DEFAULT_PAGE_SIZE, MULTI_BUSINESS_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('business', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('business', 'count', { where }),
    ]);
    return [items, total];
  }

  async findChildren(parentBusinessId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('business', 'findMany', {
      where: { parentBusinessId, deletedAt: null },
      orderBy: { priority: 'desc' },
    });
  }

  // ── Business History ──────────────────────────────────────

  async createBusinessHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('businessHistory', 'create', { data });
  }

  async findBusinessHistory(businessId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('businessHistory', 'findMany', {
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Business Entity Links ─────────────────────────────────

  async createLink(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('businessEntityLink', 'create', { data });
  }

  async findLink(businessId: string, entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('businessEntityLink', 'findFirst', {
      where: { businessId, entityType, entityId },
    });
  }

  /** Every OTHER business this entity is already linked to — used to detect exclusive (non-shared) cross-business conflicts. */
  async findLinksForEntity(
    workspaceId: string,
    entityType: string,
    entityId: string,
    excludeBusinessId?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('businessEntityLink', 'findMany', {
      where: {
        workspaceId,
        entityType,
        entityId,
        ...(excludeBusinessId ? { businessId: { not: excludeBusinessId } } : {}),
      },
    });
  }

  async findLinks(filter: BusinessEntityLinkFilterOptions): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {};
    if (filter.businessId) where['businessId'] = filter.businessId;
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.entityType) where['entityType'] = filter.entityType;
    if (filter.entityId) where['entityId'] = filter.entityId;
    return this.call<Record<string, unknown>[]>('businessEntityLink', 'findMany', {
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteLink(id: string): Promise<void> {
    await this.call('businessEntityLink', 'delete', { where: { id } });
  }
}
