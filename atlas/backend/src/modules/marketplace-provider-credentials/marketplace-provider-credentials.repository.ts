import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  CredentialStatus,
  CredentialVersionStatus,
  IMarketplaceProviderCredential,
} from './interfaces';
import { MP_CREDENTIAL_CONSTANTS } from './constants';

type PrismaModel = ReturnType<typeof Object.create>;

/**
 * Repository for persisting marketplace provider credentials.
 * All queries are workspace-scoped.
 * Encrypted fields are the only sensitive data stored in the DB.
 */
@Injectable()
export class MarketplaceProviderCredentialsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get credentialModel(): PrismaModel {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceProviderCredentialRecord'] as PrismaModel;
  }

  private get historyModel(): PrismaModel {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceProviderCredentialHistory'] as PrismaModel;
  }

  // ── CRUD ──────────────────────────────────────────────────

  async create(data: {
    workspaceId: string;
    providerKey: string;
    accountId?: string | null;
    marketplaceKey?: string | null;
    credentialSetName: string;
    description?: string | null;
    status?: CredentialStatus;
    versionStatus?: CredentialVersionStatus;
    encryptedFields: Record<string, string>;
    encryptionVersion?: string;
    expiresAt?: Date | null;
    createdBy?: string | null;
    updatedBy?: string | null;
  }): Promise<IMarketplaceProviderCredential> {
    return this.credentialModel.create({
      data: {
        workspaceId: data.workspaceId,
        providerKey: data.providerKey.toUpperCase(),
        accountId: data.accountId,
        marketplaceKey: data.marketplaceKey,
        credentialSetName: data.credentialSetName,
        description: data.description,
        status: data.status ?? CredentialStatus.PENDING_VALIDATION,
        version: 1,
        versionStatus: data.versionStatus ?? CredentialVersionStatus.DRAFT,
        encryptedFields: data.encryptedFields,
        encryptionVersion: data.encryptionVersion ?? MP_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      },
    }) as Promise<IMarketplaceProviderCredential>;
  }

  async findById(id: string, workspaceId: string): Promise<IMarketplaceProviderCredential | null> {
    return this.credentialModel.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IMarketplaceProviderCredential | null>;
  }

  async findActive(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<IMarketplaceProviderCredential | null> {
    return this.credentialModel.findFirst({
      where: {
        providerKey: providerKey.toUpperCase(),
        workspaceId,
        status: CredentialStatus.ACTIVE,
        deletedAt: null,
        ...(accountId ? { accountId } : {}),
        ...(marketplaceKey ? { marketplaceKey } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    }) as Promise<IMarketplaceProviderCredential | null>;
  }

  async findMany(filter: {
    workspaceId?: string;
    providerKey?: string;
    accountId?: string;
    marketplaceKey?: string;
    status?: CredentialStatus | CredentialStatus[];
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<[IMarketplaceProviderCredential[], number]> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MP_CREDENTIAL_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CREDENTIAL_CONSTANTS.MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;

    const where = this.buildWhere(filter);

    const sortBy = MP_CREDENTIAL_CONSTANTS.SORT_FIELDS.has(filter.sortBy ?? '')
      ? filter.sortBy!
      : 'createdAt';

    const [items, total] = await Promise.all([
      this.credentialModel.findMany({
        where,
        orderBy: { [sortBy]: filter.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      this.credentialModel.count({ where }),
    ]);

    return [items as IMarketplaceProviderCredential[], total as number];
  }

  async update(
    id: string,
    workspaceId: string,
    data: Partial<{
      credentialSetName: string;
      description: string | null;
      status: CredentialStatus;
      versionStatus: CredentialVersionStatus;
      version: number;
      publishedVersion: number | null;
      encryptedFields: Record<string, string>;
      encryptionVersion: string;
      expiresAt: Date | null;
      lastValidatedAt: Date | null;
      lastRotatedAt: Date | null;
      rotationScheduledAt: Date | null;
      updatedBy: string | null;
    }>,
  ): Promise<IMarketplaceProviderCredential> {
    return this.credentialModel.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    }) as Promise<IMarketplaceProviderCredential>;
  }

  async softDelete(id: string, workspaceId: string): Promise<void> {
    await this.credentialModel.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date(), status: CredentialStatus.REVOKED },
    });
  }

  // ── History ───────────────────────────────────────────────

  async createHistory(data: {
    credentialId: string;
    workspaceId: string;
    providerKey: string;
    version: number;
    status: CredentialStatus;
    versionStatus: CredentialVersionStatus;
    encryptedFields: Record<string, string>;
    encryptionVersion: string;
    expiresAt?: Date | null;
    changeReason?: string | null;
    changedBy?: string | null;
  }): Promise<void> {
    await this.historyModel.create({ data });
  }

  async findHistory(credentialId: string): Promise<Record<string, unknown>[]> {
    return this.historyModel.findMany({
      where: { credentialId },
      orderBy: { version: 'desc' },
    }) as Promise<Record<string, unknown>[]>;
  }

  async findHistoryByVersion(
    credentialId: string,
    version: number,
  ): Promise<Record<string, unknown> | null> {
    return this.historyModel.findFirst({
      where: { credentialId, version },
    }) as Promise<Record<string, unknown> | null>;
  }

  async getNextVersion(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
  ): Promise<number> {
    const latest = await this.credentialModel.findFirst({
      where: {
        providerKey: providerKey.toUpperCase(),
        workspaceId,
        deletedAt: null,
        ...(accountId ? { accountId } : {}),
      },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return ((latest as { version: number } | null)?.version ?? 0) + 1;
  }

  // ── Helpers ───────────────────────────────────────────────

  private buildWhere(filter: {
    workspaceId?: string;
    providerKey?: string;
    accountId?: string;
    marketplaceKey?: string;
    status?: CredentialStatus | CredentialStatus[];
    search?: string;
  }): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.providerKey) where['providerKey'] = filter.providerKey.toUpperCase();
    if (filter.accountId) where['accountId'] = filter.accountId;
    if (filter.marketplaceKey) where['marketplaceKey'] = filter.marketplaceKey;

    if (filter.status) {
      where['status'] = Array.isArray(filter.status)
        ? { in: filter.status }
        : filter.status;
    }

    if (filter.search) {
      where['OR'] = [
        { credentialSetName: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
