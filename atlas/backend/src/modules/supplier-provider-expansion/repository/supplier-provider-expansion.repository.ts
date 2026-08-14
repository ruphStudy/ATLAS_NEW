import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { SupplierProviderExpansionFilterOptions } from '../interfaces';
import { SUPPLIER_PROVIDER_EXPANSION_CONSTANTS } from '../constants';

@Injectable()
export class SupplierProviderExpansionRepository extends BaseRepository {
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

  // ── Expansion ───────────────────────────────────────────────

  async createExpansion(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('supplierProviderExpansion', 'create', { data });
  }

  async findExpansionById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('supplierProviderExpansion', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findExpansion(providerCode: string, workspaceId: string | null): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('supplierProviderExpansion', 'findFirst', {
      where: { providerCode, workspaceId, deletedAt: null },
    });
  }

  /** Prefers a workspace-scoped expansion override over the platform-wide one for the same provider. */
  async resolveExpansion(providerCode: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    const scoped = await this.findExpansion(providerCode, workspaceId);
    if (scoped) return scoped;
    return this.findExpansion(providerCode, null);
  }

  async updateExpansion(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('supplierProviderExpansion', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findExpansions(filter: SupplierProviderExpansionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.providerCode) where['providerCode'] = filter.providerCode;
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.rolloutState) where['rolloutState'] = filter.rolloutState;
    if (filter.search) {
      where['providerCode'] = { contains: filter.search, mode: 'insensitive' };
    }

    const sortField = SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'providerCode'] ?? 'providerCode';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };
    const take = Math.min(filter.limit ?? SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('supplierProviderExpansion', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('supplierProviderExpansion', 'count', { where }),
    ]);
    return [items, total];
  }

  // ── Expansion History ─────────────────────────────────────

  async createExpansionHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('supplierProviderExpansionHistory', 'create', { data });
  }

  async findExpansionHistory(expansionId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('supplierProviderExpansionHistory', 'findMany', {
      where: { expansionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
