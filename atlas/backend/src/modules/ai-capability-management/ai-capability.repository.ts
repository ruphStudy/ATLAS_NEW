import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  CapabilityDefinitionStatus,
  CapabilityOverrideScope,
  IAiCapabilityDefinitionFilterOptions,
  IAiCapabilityOverrideFilterOptions,
} from './interfaces';
import { AI_CAPABILITY_CONSTANTS } from './constants';

const DEFINITION_MODEL = 'aiCapabilityDefinition';
const OVERRIDE_MODEL = 'aiCapabilityOverride';

@Injectable()
export class AiCapabilityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Definitions ───────────────────────────────────────────

  async createDefinition(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(DEFINITION_MODEL, 'create', { data });
  }

  async findDefinitionById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(DEFINITION_MODEL, 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  /** Latest non-deleted definition for a capability key, regardless of status. */
  async findLatestByCapabilityKey(capabilityKey: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(DEFINITION_MODEL, 'findFirst', {
      where: { capabilityKey, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** The ACTIVE definition for a capability key, if any. */
  async findActiveByCapabilityKey(capabilityKey: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(DEFINITION_MODEL, 'findFirst', {
      where: { capabilityKey, status: CapabilityDefinitionStatus.ACTIVE, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findConflictingDefinition(capabilityKey: string, version: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(DEFINITION_MODEL, 'findFirst', {
      where: { capabilityKey, version, deletedAt: null },
    });
  }

  async findDefinitions(
    filter: IAiCapabilityDefinitionFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.capabilityKey) where['capabilityKey'] = filter.capabilityKey;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['displayName'] = { contains: filter.search, mode: 'insensitive' };
    }

    const sortField = AI_CAPABILITY_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const limit = Math.min(filter.limit ?? AI_CAPABILITY_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CAPABILITY_CONSTANTS.MAX_PAGE_SIZE);
    const page = filter.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>(DEFINITION_MODEL, 'findMany', {
        where,
        orderBy: { [sortField]: filter.sortOrder ?? 'desc' },
        take: limit,
        skip,
      }),
      this.call<number>(DEFINITION_MODEL, 'count', { where }),
    ]);

    return [items, total];
  }

  async updateDefinition(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(DEFINITION_MODEL, 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Overrides ─────────────────────────────────────────────

  async createOverride(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(OVERRIDE_MODEL, 'create', { data });
  }

  async findOverrideById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(OVERRIDE_MODEL, 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findConflictingOverride(params: {
    scope: CapabilityOverrideScope;
    capabilityKey: string;
    workspaceId?: string | null;
    providerKey?: string | null;
    modelId?: string | null;
    excludeId?: string;
  }): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(OVERRIDE_MODEL, 'findFirst', {
      where: {
        scope: params.scope,
        capabilityKey: params.capabilityKey,
        workspaceId: params.workspaceId ?? null,
        providerKey: params.providerKey ?? null,
        modelId: params.modelId ?? null,
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });
  }

  /**
   * The single most specific ACTIVE override matching one scope tier —
   * the resolver calls this once per tier (MODEL, then PROVIDER, then
   * WORKSPACE, then GLOBAL).
   */
  async findActiveOverride(params: {
    scope: CapabilityOverrideScope;
    capabilityKey: string;
    workspaceId?: string | null;
    providerKey?: string | null;
    modelId?: string | null;
  }): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(OVERRIDE_MODEL, 'findFirst', {
      where: {
        scope: params.scope,
        capabilityKey: params.capabilityKey,
        workspaceId: params.workspaceId ?? null,
        providerKey: params.providerKey ?? null,
        modelId: params.modelId ?? null,
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { priority: 'asc' },
    });
  }

  async findOverrides(
    filter: IAiCapabilityOverrideFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.scope) where['scope'] = filter.scope;
    if (filter.capabilityKey) where['capabilityKey'] = filter.capabilityKey;
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.modelId) where['modelId'] = filter.modelId;
    if (filter.status) where['status'] = filter.status;

    const sortField = AI_CAPABILITY_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const limit = Math.min(filter.limit ?? AI_CAPABILITY_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CAPABILITY_CONSTANTS.MAX_PAGE_SIZE);
    const page = filter.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>(OVERRIDE_MODEL, 'findMany', {
        where,
        orderBy: { [sortField]: filter.sortOrder ?? 'desc' },
        take: limit,
        skip,
      }),
      this.call<number>(OVERRIDE_MODEL, 'count', { where }),
    ]);

    return [items, total];
  }

  async updateOverride(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(OVERRIDE_MODEL, 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }
}
