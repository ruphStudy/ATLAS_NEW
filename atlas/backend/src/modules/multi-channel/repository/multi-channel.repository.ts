import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ChannelFilterOptions, ChannelProductMappingFilterOptions } from '../interfaces';
import { MULTI_CHANNEL_CONSTANTS } from '../constants';

@Injectable()
export class MultiChannelRepository extends BaseRepository {
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

  // ── Channel ─────────────────────────────────────────────────

  async createChannel(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channel', 'create', { data });
  }

  async findChannelById(id: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('channel', 'findFirst', {
      where: { id, deletedAt: null, ...(workspaceId ? { workspaceId } : {}) },
    });
  }

  async findChannelByKey(workspaceId: string, channelKey: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('channel', 'findFirst', {
      where: { workspaceId, channelKey, deletedAt: null },
    });
  }

  async findDefaultChannel(workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('channel', 'findFirst', {
      where: { workspaceId, isDefault: true, deletedAt: null },
    });
  }

  async clearDefaultChannel(workspaceId: string): Promise<void> {
    await this.call('channel', 'updateMany', {
      where: { workspaceId, isDefault: true, deletedAt: null },
      data: { isDefault: false },
    });
  }

  async updateChannel(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channel', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findChannels(filter: ChannelFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.businessId !== undefined) where['businessId'] = filter.businessId;
    if (filter.brandId !== undefined) where['brandId'] = filter.brandId;
    if (filter.channelType) where['channelType'] = filter.channelType;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { channelKey: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = MULTI_CHANNEL_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'priority'] ?? 'priority';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const take = Math.min(filter.limit ?? MULTI_CHANNEL_CONSTANTS.DEFAULT_PAGE_SIZE, MULTI_CHANNEL_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('channel', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('channel', 'count', { where }),
    ]);
    return [items, total];
  }

  /** Currently-enabled channels for a workspace, ranked by priority — the routing pool. */
  async findActiveChannels(workspaceId: string, businessId?: string | null, brandId?: string | null): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('channel', 'findMany', {
      where: {
        workspaceId,
        status: 'ACTIVE',
        deletedAt: null,
        ...(businessId ? { businessId } : {}),
        ...(brandId ? { brandId } : {}),
      },
      orderBy: { priority: 'desc' },
    });
  }

  // ── Channel History ────────────────────────────────────────

  async createChannelHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channelHistory', 'create', { data });
  }

  async findChannelHistory(channelId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('channelHistory', 'findMany', {
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Channel Product Mapping ───────────────────────────────

  async createMapping(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channelProductMapping', 'create', { data });
  }

  async findMapping(channelId: string, internalProductId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('channelProductMapping', 'findFirst', {
      where: { channelId, internalProductId },
    });
  }

  async findMappingById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('channelProductMapping', 'findFirst', { where: { id } });
  }

  async findMappings(filter: ChannelProductMappingFilterOptions): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {};
    if (filter.channelId) where['channelId'] = filter.channelId;
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.internalProductId) where['internalProductId'] = filter.internalProductId;
    if (filter.externalSku) where['externalSku'] = filter.externalSku;
    return this.call<Record<string, unknown>[]>('channelProductMapping', 'findMany', {
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMapping(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channelProductMapping', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteMapping(id: string): Promise<void> {
    await this.call('channelProductMapping', 'delete', { where: { id } });
  }

  // ── Channel Operation Log (idempotency) ───────────────────

  async findOperationLog(channelId: string, operationType: string, idempotencyKey: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('channelOperationLog', 'findFirst', {
      where: { channelId, operationType, idempotencyKey },
    });
  }

  async createOperationLog(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channelOperationLog', 'create', { data });
  }

  async updateOperationLog(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('channelOperationLog', 'update', { where: { id }, data });
  }
}
