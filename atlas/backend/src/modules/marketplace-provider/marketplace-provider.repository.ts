import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  MarketplaceAccountStatus,
  MarketplaceProviderConfiguration,
  WorkspaceMarketplaceProviderConfig,
} from './interfaces';

type PrismaModel = ReturnType<typeof Object.create>;

/**
 * Repository for persisting marketplace provider configuration and accounts.
 * All queries are workspace-scoped.
 */
@Injectable()
export class MarketplaceProviderRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get configModel(): PrismaModel {
    return (this.prisma as unknown as Record<string, unknown>)['workspaceMarketplaceProviderConfig'] as PrismaModel;
  }

  private get accountModel(): PrismaModel {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceProviderAccount'] as PrismaModel;
  }

  private get healthLogModel(): PrismaModel {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceProviderHealthLog'] as PrismaModel;
  }

  private get auditLogModel(): PrismaModel {
    return (this.prisma as unknown as Record<string, unknown>)['marketplaceProviderAuditLog'] as PrismaModel;
  }

  // ── Provider Configs ──────────────────────────────────────────

  async upsertConfig(data: {
    workspaceId: string;
    providerKey: string;
    accountId?: string | null;
    isEnabled?: boolean;
    priority?: number;
    configuration?: MarketplaceProviderConfiguration;
    encryptedCredentials?: string | null;
    credentialIv?: string | null;
    credentialAuthTag?: string | null;
    credentialType?: string | null;
    credentialExpiresAt?: Date | null;
    credentialValidatedAt?: Date | null;
    createdBy?: string;
  }): Promise<WorkspaceMarketplaceProviderConfig> {
    return this.configModel.upsert({
      where: {
        workspaceId_providerKey_accountId: {
          workspaceId: data.workspaceId,
          providerKey: data.providerKey.toUpperCase(),
          accountId: data.accountId ?? '',
        },
      },
      update: {
        isEnabled: data.isEnabled,
        priority: data.priority,
        configuration: data.configuration as Record<string, unknown>,
        encryptedCredentials: data.encryptedCredentials,
        credentialIv: data.credentialIv,
        credentialAuthTag: data.credentialAuthTag,
        credentialType: data.credentialType,
        credentialExpiresAt: data.credentialExpiresAt,
        credentialValidatedAt: data.credentialValidatedAt,
        updatedAt: new Date(),
      },
      create: {
        workspaceId: data.workspaceId,
        providerKey: data.providerKey.toUpperCase(),
        accountId: data.accountId,
        isEnabled: data.isEnabled ?? true,
        priority: data.priority ?? 50,
        configuration: (data.configuration ?? {}) as Record<string, unknown>,
        encryptedCredentials: data.encryptedCredentials,
        credentialIv: data.credentialIv,
        credentialAuthTag: data.credentialAuthTag,
        credentialType: data.credentialType,
        credentialExpiresAt: data.credentialExpiresAt,
        credentialValidatedAt: data.credentialValidatedAt,
        createdBy: data.createdBy,
      },
    }) as Promise<WorkspaceMarketplaceProviderConfig>;
  }

  async findConfigById(id: string, workspaceId: string): Promise<WorkspaceMarketplaceProviderConfig | null> {
    return this.configModel.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<WorkspaceMarketplaceProviderConfig | null>;
  }

  async findConfigs(workspaceId: string, providerKey?: string): Promise<WorkspaceMarketplaceProviderConfig[]> {
    return this.configModel.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(providerKey ? { providerKey: providerKey.toUpperCase() } : {}),
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }) as Promise<WorkspaceMarketplaceProviderConfig[]>;
  }

  async findActiveConfig(
    workspaceId: string,
    providerKey: string,
    accountId?: string | null,
  ): Promise<WorkspaceMarketplaceProviderConfig | null> {
    return this.configModel.findFirst({
      where: {
        workspaceId,
        providerKey: providerKey.toUpperCase(),
        isEnabled: true,
        deletedAt: null,
        ...(accountId ? { accountId } : {}),
      },
    }) as Promise<WorkspaceMarketplaceProviderConfig | null>;
  }

  async updateConfig(
    id: string,
    workspaceId: string,
    data: Partial<WorkspaceMarketplaceProviderConfig>,
  ): Promise<WorkspaceMarketplaceProviderConfig> {
    return this.configModel.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    }) as Promise<WorkspaceMarketplaceProviderConfig>;
  }

  async softDeleteConfig(id: string, workspaceId: string): Promise<void> {
    await this.configModel.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date(), isEnabled: false },
    });
  }

  // ── Marketplace Accounts ──────────────────────────────────────

  async createAccount(data: {
    workspaceId: string;
    providerKey: string;
    accountHandle: string;
    displayName?: string | null;
    country?: string | null;
    region?: string | null;
    currency?: string | null;
    isDefault?: boolean;
    status?: MarketplaceAccountStatus;
    createdBy?: string;
  }): Promise<Record<string, unknown>> {
    return this.accountModel.create({
      data: {
        workspaceId: data.workspaceId,
        providerKey: data.providerKey.toUpperCase(),
        accountHandle: data.accountHandle,
        displayName: data.displayName,
        country: data.country,
        region: data.region,
        currency: data.currency,
        isDefault: data.isDefault ?? false,
        status: data.status ?? MarketplaceAccountStatus.PENDING_VERIFICATION,
        createdBy: data.createdBy,
      },
    }) as Promise<Record<string, unknown>>;
  }

  async findAccountById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.accountModel.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<Record<string, unknown> | null>;
  }

  async findAccounts(workspaceId: string, providerKey?: string): Promise<Record<string, unknown>[]> {
    return this.accountModel.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        ...(providerKey ? { providerKey: providerKey.toUpperCase() } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }) as Promise<Record<string, unknown>[]>;
  }

  async updateAccount(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.accountModel.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    }) as Promise<Record<string, unknown>>;
  }

  async softDeleteAccount(id: string, workspaceId: string): Promise<void> {
    await this.accountModel.updateMany({
      where: { id, workspaceId, deletedAt: null },
      data: { deletedAt: new Date(), status: MarketplaceAccountStatus.INACTIVE },
    });
  }

  // ── Health Logs ───────────────────────────────────────────────

  async createHealthLog(data: {
    workspaceId?: string | null;
    providerKey: string;
    accountId?: string | null;
    status: string;
    latencyMs?: number | null;
    message?: string | null;
    details?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.healthLogModel.create({
      data: {
        workspaceId: data.workspaceId,
        providerKey: data.providerKey.toUpperCase(),
        accountId: data.accountId,
        status: data.status,
        latencyMs: data.latencyMs,
        message: data.message,
        details: data.details,
        checkedAt: new Date(),
      },
    });
  }

  async findRecentHealthLogs(
    providerKey: string,
    limit = 20,
  ): Promise<Record<string, unknown>[]> {
    return this.healthLogModel.findMany({
      where: { providerKey: providerKey.toUpperCase() },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    }) as Promise<Record<string, unknown>[]>;
  }

  // ── Audit Logs ────────────────────────────────────────────────

  async createAuditLog(data: {
    workspaceId: string;
    providerKey: string;
    accountId?: string | null;
    action: string;
    capability?: string | null;
    correlationId: string;
    success: boolean;
    durationMs: number;
    errorCode?: string | null;
    performedBy?: string | null;
    details?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.auditLogModel.create({
      data: {
        workspaceId: data.workspaceId,
        providerKey: data.providerKey.toUpperCase(),
        accountId: data.accountId,
        action: data.action,
        capability: data.capability,
        correlationId: data.correlationId,
        success: data.success,
        durationMs: data.durationMs,
        errorCode: data.errorCode,
        performedBy: data.performedBy,
        details: data.details,
      },
    });
  }
}
