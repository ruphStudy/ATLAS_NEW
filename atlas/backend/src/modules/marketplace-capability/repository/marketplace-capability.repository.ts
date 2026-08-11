import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { CapabilityFilterOptions, CapabilityStatus } from '../interfaces';
import { MP_CAPABILITY_CONSTANTS } from '../constants';

@Injectable()
export class MarketplaceCapabilityRepository extends BaseRepository {
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

  // ── Capability Definition ─────────────────────────────────

  async createDefinition(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCapabilityDefinition', 'create', { data });
  }

  async findDefinitionById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCapabilityDefinition', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findDefinitionByKey(capabilityKey: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceCapabilityDefinition', 'findFirst', {
      where: { capabilityKey: capabilityKey.toUpperCase(), deletedAt: null },
    });
  }

  async findDefinitions(filter: CapabilityFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildDefinitionWhere(filter);
    const sortField = MP_CAPABILITY_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const take = Math.min(filter.limit ?? MP_CAPABILITY_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CAPABILITY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceCapabilityDefinition', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('marketplaceCapabilityDefinition', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateDefinition(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCapabilityDefinition', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteDefinition(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.updateDefinition(id, { deletedAt: new Date(), updatedBy: userId });
  }

  async getNextVersion(capabilityKey: string): Promise<number> {
    const existing = await this.call<{ version: number } | null>('marketplaceCapabilityDefinition', 'findFirst', {
      where: { capabilityKey: capabilityKey.toUpperCase(), deletedAt: null },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return existing ? existing.version + 1 : 1;
  }

  private buildDefinitionWhere(filter: CapabilityFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.capabilityKey) where['capabilityKey'] = filter.capabilityKey.toUpperCase();
    if (filter.category) where['category'] = filter.category;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { capabilityKey: { contains: filter.search.toUpperCase() } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  // ── Definition History ────────────────────────────────────

  async createDefinitionHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCapabilityDefinitionHistory', 'create', { data });
  }

  async findDefinitionHistory(
    definitionId: string,
    limit = 20,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCapabilityDefinitionHistory', 'findMany', {
      where: { definitionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Provider Declarations ─────────────────────────────────

  async upsertDeclaration(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { providerKey, capabilityKey, workspaceId = null, accountId = null, marketplaceKey = null } = data as {
      providerKey: string;
      capabilityKey: string;
      workspaceId?: string | null;
      accountId?: string | null;
      marketplaceKey?: string | null;
    };
    const existing = await this.findDeclaration(
      providerKey as string,
      capabilityKey as string,
      workspaceId as string | null,
      accountId as string | null,
      marketplaceKey as string | null,
    );
    if (existing) {
      return this.call<Record<string, unknown>>('marketplaceProviderCapabilityDeclaration', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }
    return this.call<Record<string, unknown>>('marketplaceProviderCapabilityDeclaration', 'create', { data });
  }

  async findDeclaration(
    providerKey: string,
    capabilityKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceProviderCapabilityDeclaration', 'findFirst', {
      where: {
        providerKey: providerKey.toUpperCase(),
        capabilityKey: capabilityKey.toUpperCase(),
        deletedAt: null,
        ...(workspaceId !== undefined ? { workspaceId } : {}),
        ...(accountId !== undefined ? { accountId } : {}),
        ...(marketplaceKey !== undefined ? { marketplaceKey } : {}),
      },
      orderBy: [
        { workspaceId: 'desc' },
        { accountId: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findDeclarations(
    providerKey: string,
    workspaceId?: string | null,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceProviderCapabilityDeclaration', 'findMany', {
      where: {
        providerKey: providerKey.toUpperCase(),
        deletedAt: null,
        ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
      },
    });
  }

  async updateDeclaration(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceProviderCapabilityDeclaration', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteDeclaration(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.updateDeclaration(id, { deletedAt: new Date(), updatedBy: userId });
  }

  // ── Overrides ─────────────────────────────────────────────

  async createOverride(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCapabilityOverride', 'create', { data });
  }

  async findOverrides(
    capabilityKey: string,
    workspaceId?: string | null,
    providerKey?: string | null,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceCapabilityOverride', 'findMany', {
      where: {
        capabilityKey: capabilityKey.toUpperCase(),
        deletedAt: null,
        ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
        ...(providerKey ? { OR: [{ providerKey: providerKey.toUpperCase() }, { providerKey: null }] } : {}),
      },
      orderBy: { priority: 'desc' },
    });
  }

  async updateOverride(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceCapabilityOverride', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteOverride(id: string, userId?: string): Promise<Record<string, unknown>> {
    return this.updateOverride(id, { deletedAt: new Date(), updatedBy: userId });
  }
}
