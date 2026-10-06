import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { CredentialStatus, IAiProviderCredentialFilterOptions } from './interfaces';
import { AI_CREDENTIAL_CONSTANTS } from './constants';

const RECORD_MODEL = 'aiProviderCredentialRecord';
const HISTORY_MODEL = 'aiProviderCredentialHistory';

@Injectable()
export class AiProviderCredentialRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Accessors ─────────────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── CRUD ──────────────────────────────────────────────────

  async createCredential(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'create', { data });
  }

  async findCredentialById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findCredentials(
    workspaceId: string,
    filter: IAiProviderCredentialFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(workspaceId, filter);
    const sortField = AI_CREDENTIAL_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const limit = Math.min(filter.limit ?? AI_CREDENTIAL_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CREDENTIAL_CONSTANTS.MAX_PAGE_SIZE);
    const page = filter.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>(RECORD_MODEL, 'findMany', { where, orderBy, take: limit, skip }),
      this.call<number>(RECORD_MODEL, 'count', { where }),
    ]);

    return [items, total];
  }

  /**
   * Exact-match lookup for one resolution tier. The resolver tries
   * progressively less specific scopes (model+account, account, provider
   * only) by calling this with narrower params.
   */
  async findActiveByScope(params: {
    providerKey: string;
    workspaceId: string;
    accountId?: string | null;
    modelId?: string | null;
  }): Promise<Record<string, unknown> | null> {
    const now = new Date();
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        workspaceId: params.workspaceId,
        accountId: params.accountId ?? null,
        modelId: params.modelId ?? null,
        status: CredentialStatus.ACTIVE,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findConflicting(params: {
    providerKey: string;
    workspaceId: string;
    accountId?: string | null;
    modelId?: string | null;
    excludeId?: string;
  }): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        workspaceId: params.workspaceId,
        accountId: params.accountId ?? null,
        modelId: params.modelId ?? null,
        status: { not: CredentialStatus.REVOKED },
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });
  }

  async updateCredential(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteCredential(id: string): Promise<void> {
    await this.call<unknown>(RECORD_MODEL, 'updateMany', {
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), status: CredentialStatus.REVOKED },
    });
  }

  async getNextVersion(params: {
    providerKey: string;
    workspaceId: string;
    accountId?: string | null;
    modelId?: string | null;
  }): Promise<number> {
    const latest = await this.call<{ version: number } | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        workspaceId: params.workspaceId,
        accountId: params.accountId ?? null,
        modelId: params.modelId ?? null,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  }

  /**
   * Finds credentials past expiry that are still marked ACTIVE — used to
   * lazily transition them to EXPIRED on resolution rather than requiring
   * a background scheduler.
   */
  async findExpiredButActive(workspaceId: string, providerKey: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>(RECORD_MODEL, 'findMany', {
      where: {
        workspaceId,
        providerKey,
        status: CredentialStatus.ACTIVE,
        deletedAt: null,
        expiresAt: { lt: new Date() },
      },
    });
  }

  // ── History ────────────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<void> {
    await this.call<unknown>(HISTORY_MODEL, 'create', { data });
  }

  async findHistory(credentialId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>(HISTORY_MODEL, 'findMany', {
      where: { credentialId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findHistoryByVersion(credentialId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(HISTORY_MODEL, 'findFirst', {
      where: { credentialId, version },
    });
  }

  // ── Internals ─────────────────────────────────────────────

  private buildWhere(
    workspaceId: string,
    filter: IAiProviderCredentialFilterOptions,
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };

    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.modelId) where['modelId'] = filter.modelId;
    if (filter.accountId) where['accountId'] = filter.accountId;
    if (filter.status) where['status'] = filter.status;
    if (filter.type) where['type'] = filter.type;
    if (filter.search) {
      where['OR'] = [
        { credentialSetName: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
