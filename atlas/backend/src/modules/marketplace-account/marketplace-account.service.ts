import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AccountEvent,
  AccountFilterOptions,
  AccountStatus,
  IMarketplaceAccount,
  IMarketplaceAccountHistory,
} from './interfaces';
import { MarketplaceAccountRepository } from './repository/marketplace-account.repository';
import { AccountValidator } from './validator/account.validator';
import { AccountStatusManager } from './status/account-status.manager';
import { AccountConfigurationResolver } from './config/account-configuration.resolver';
import { AccountEventQueue } from './events/account-events.queue';
import { AccountAudit } from './audit/account.audit';
import { MarketplaceConnectionTestService } from '../marketplace-connection-test/marketplace-connection-test.service';
import { ConnectionTestTrigger } from '../marketplace-connection-test/interfaces';
import { MP_ACCOUNT_CONSTANTS, MP_ACCOUNT_ERROR_CODES } from './constants';

// ── Create / Update DTOs ──────────────────────────────────────

export interface CreateAccountDto {
  workspaceId: string;
  providerKey: string;
  marketplaceKey: string;
  accountName: string;
  externalAccountId: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  credentialRef?: string | null;
  priority?: number;
  isDefault?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
}

export interface UpdateAccountDto {
  accountName?: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  credentialRef?: string | null;
  priority?: number;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
  expectedVersion?: number;
}

// ── Service ───────────────────────────────────────────────────

@Injectable()
export class MarketplaceAccountService {
  private readonly logger = new Logger(MarketplaceAccountService.name);

  constructor(
    private readonly repository: MarketplaceAccountRepository,
    private readonly validator: AccountValidator,
    private readonly statusManager: AccountStatusManager,
    private readonly configResolver: AccountConfigurationResolver,
    private readonly eventQueue: AccountEventQueue,
    private readonly audit: AccountAudit,
    private readonly connectionTestService: MarketplaceConnectionTestService,
  ) {}

  // ── Create ────────────────────────────────────────────────

  async createAccount(dto: CreateAccountDto): Promise<IMarketplaceAccount> {
    const validation = this.validator.validate(dto);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Account validation failed', errors: validation.errors });
    }

    // Validate provider + config
    const configResult = await this.configResolver.resolve({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      configurationRef: dto.configurationRef,
      credentialRef: dto.credentialRef,
    });
    if (!configResult.valid) {
      throw new UnprocessableEntityException({
        message: 'Account configuration validation failed',
        errors: configResult.errors,
        code: MP_ACCOUNT_ERROR_CODES.PROVIDER_NOT_REGISTERED,
      });
    }

    // Prevent duplicate external account mappings
    const existing = await this.repository.findByExternalAccountId(
      dto.workspaceId,
      dto.providerKey,
      dto.externalAccountId,
    );
    if (existing) {
      throw new ConflictException({
        message: `An account with externalAccountId '${dto.externalAccountId}' already exists for provider '${dto.providerKey}'`,
        code: MP_ACCOUNT_ERROR_CODES.DUPLICATE_EXTERNAL_ACCOUNT,
      });
    }

    const data: Record<string, unknown> = {
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey.toUpperCase(),
      marketplaceKey: dto.marketplaceKey.toUpperCase(),
      accountName: dto.accountName,
      externalAccountId: dto.externalAccountId,
      sellerId: dto.sellerId ?? null,
      merchantId: dto.merchantId ?? null,
      country: dto.country ?? null,
      region: dto.region ?? null,
      currency: dto.currency ?? null,
      locale: dto.locale ?? null,
      configurationRef: dto.configurationRef ?? null,
      credentialRef: dto.credentialRef ?? null,
      status: AccountStatus.DRAFT,
      priority: dto.priority ?? 0,
      isDefault: false, // must be set explicitly via setDefault
      metadata: dto.metadata ?? null,
      version: 1,
      createdBy: dto.createdBy ?? null,
      updatedBy: dto.createdBy ?? null,
    };

    const account = (await this.repository.create(data)) as unknown as IMarketplaceAccount;

    await this.audit.log(account, AccountEvent.CREATED, { toStatus: AccountStatus.DRAFT, changedBy: dto.createdBy });
    await this.publishEvent(AccountEvent.CREATED, account);

    return account;
  }

  // ── Find ──────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);
    return account;
  }

  async findAll(
    filter: AccountFilterOptions,
  ): Promise<{ items: IMarketplaceAccount[]; total: number; page: number; limit: number; totalPages: number }> {
    const [items, total] = await this.repository.findMany(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? MP_ACCOUNT_CONSTANTS.DEFAULT_PAGE_SIZE;
    return {
      items: items as unknown as IMarketplaceAccount[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Update ────────────────────────────────────────────────

  async updateAccount(id: string, workspaceId: string, dto: UpdateAccountDto): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);
    this.statusManager.assertMutable(account);

    const validation = this.validator.validateUpdate(dto);
    if (!validation.valid) {
      throw new BadRequestException({ message: 'Update validation failed', errors: validation.errors });
    }

    const updateData: Record<string, unknown> = { updatedBy: dto.updatedBy ?? null };
    const fields: Array<keyof UpdateAccountDto> = [
      'accountName', 'sellerId', 'merchantId', 'country', 'region',
      'currency', 'locale', 'configurationRef', 'credentialRef', 'priority', 'metadata',
    ];
    for (const f of fields) {
      if (f in dto && dto[f] !== undefined) updateData[f] = dto[f] as unknown;
    }

    const updated = await this.repository.update(id, workspaceId, updateData, dto.expectedVersion);
    const result = updated as unknown as IMarketplaceAccount;

    await this.audit.log(result, AccountEvent.UPDATED, { fromStatus: account.status, toStatus: result.status, changedBy: dto.updatedBy });
    await this.publishEvent(AccountEvent.UPDATED, result);

    return result;
  }

  // ── Enable (DRAFT/INVALID/EXPIRED → PENDING_VALIDATION → ACTIVE) ─────────────

  async enableAccount(id: string, workspaceId: string, opts?: { testedBy?: string | null }): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);

    // Step 1: transition to PENDING_VALIDATION if needed
    let pending = account;
    if (account.status === AccountStatus.DRAFT || account.status === AccountStatus.INVALID || account.status === AccountStatus.EXPIRED) {
      this.statusManager.assertTransition(account.status, AccountStatus.PENDING_VALIDATION);
      pending = await this.transition(account, AccountStatus.PENDING_VALIDATION, opts?.testedBy);
    } else if (account.status !== AccountStatus.PENDING_VALIDATION) {
      this.statusManager.assertTransition(account.status, AccountStatus.ACTIVE);
    }

    // Step 2: run connection test
    const testResult = await this.connectionTestService.test({
      workspaceId,
      providerKey: pending.providerKey,
      accountId: pending.id,
      trigger: ConnectionTestTrigger.MANUAL,
      timeoutMs: MP_ACCOUNT_CONSTANTS.CONNECTION_TEST_TIMEOUT_MS,
    });

    // Record test result on account regardless of outcome
    const testUpdate: Record<string, unknown> = {
      lastTestedAt: testResult.testedAt,
      lastTestSuccess: testResult.success,
      lastTestCorrelationId: testResult.correlationId,
      updatedBy: opts?.testedBy ?? null,
    };

    if (!testResult.success) {
      // Transition to INVALID
      const invalid = await this.transition(
        { ...pending, ...testUpdate } as IMarketplaceAccount,
        AccountStatus.INVALID,
        opts?.testedBy,
        `Connection test failed: ${testResult.errorMessage ?? testResult.errorCode}`,
      );
      await this.publishEvent(AccountEvent.INVALID, invalid);
      throw new UnprocessableEntityException({
        message: 'Connection test failed — account marked as INVALID',
        code: MP_ACCOUNT_ERROR_CODES.CONNECTION_TEST_FAILED,
        correlationId: testResult.correlationId,
        errorCode: testResult.errorCode,
      });
    }

    // Step 3: transition to ACTIVE
    const active = await this.repository.update(id, workspaceId, {
      ...testUpdate,
      status: AccountStatus.ACTIVE,
    }) as unknown as IMarketplaceAccount;

    await this.audit.log(active, AccountEvent.ACTIVATED, {
      fromStatus: pending.status,
      toStatus: AccountStatus.ACTIVE,
      changedBy: opts?.testedBy,
    });
    await this.publishEvent(AccountEvent.ACTIVATED, active);

    return active;
  }

  // ── Disable ───────────────────────────────────────────────

  async disableAccount(id: string, workspaceId: string, opts?: { reason?: string; updatedBy?: string | null }): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);
    this.statusManager.assertTransition(account.status, AccountStatus.DISABLED);

    const disabled = await this.transition(account, AccountStatus.DISABLED, opts?.updatedBy, opts?.reason);
    await this.publishEvent(AccountEvent.DISABLED, disabled);
    return disabled;
  }

  // ── Archive ───────────────────────────────────────────────

  async archiveAccount(id: string, workspaceId: string, opts?: { reason?: string; updatedBy?: string | null }): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);
    this.statusManager.assertTransition(account.status, AccountStatus.ARCHIVED);

    // Clear default if archived
    if (account.isDefault) {
      await this.repository.clearDefault(workspaceId, account.marketplaceKey, account.country, id);
    }

    const archived = await this.transition(account, AccountStatus.ARCHIVED, opts?.updatedBy, opts?.reason);
    await this.publishEvent(AccountEvent.ARCHIVED, archived);
    return archived;
  }

  // ── Restore ───────────────────────────────────────────────

  async restoreAccount(id: string, workspaceId: string, opts?: { updatedBy?: string | null }): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);
    this.statusManager.assertTransition(account.status, AccountStatus.DRAFT);

    const restored = await this.transition(account, AccountStatus.DRAFT, opts?.updatedBy);
    await this.publishEvent(AccountEvent.RESTORED, restored);
    return restored;
  }

  // ── Delete (soft) ─────────────────────────────────────────

  async deleteAccount(id: string, workspaceId: string, opts?: { deletedBy?: string | null }): Promise<void> {
    const account = await this.requireAccount(id, workspaceId);

    if (account.isDefault) {
      await this.repository.clearDefault(workspaceId, account.marketplaceKey, account.country, id);
    }

    await this.repository.softDelete(id, workspaceId);
    await this.audit.log(account, AccountEvent.DELETED, { fromStatus: account.status, changedBy: opts?.deletedBy });
    await this.publishEvent(AccountEvent.DELETED, { ...account, status: AccountStatus.ARCHIVED });
  }

  // ── Test Connection ───────────────────────────────────────

  async testConnection(id: string, workspaceId: string): Promise<{ success: boolean; correlationId: string; errorMessage?: string | null }> {
    const account = await this.requireAccount(id, workspaceId);

    const result = await this.connectionTestService.test({
      workspaceId,
      providerKey: account.providerKey,
      accountId: id,
      trigger: ConnectionTestTrigger.MANUAL,
      timeoutMs: MP_ACCOUNT_CONSTANTS.CONNECTION_TEST_TIMEOUT_MS,
    });

    // Persist test outcome on account
    await this.repository.update(id, workspaceId, {
      lastTestedAt: result.testedAt,
      lastTestSuccess: result.success,
      lastTestCorrelationId: result.correlationId,
    });

    return {
      success: result.success,
      correlationId: result.correlationId,
      errorMessage: result.errorMessage,
    };
  }

  // ── Set Default ───────────────────────────────────────────

  async setDefaultAccount(id: string, workspaceId: string, opts?: { updatedBy?: string | null }): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);

    if (!this.statusManager.isActive(account.status)) {
      throw new UnprocessableEntityException({
        message: `Only ACTIVE accounts can be set as default`,
        code: MP_ACCOUNT_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    // Clear existing default for same marketplace + country + workspace
    await this.repository.clearDefault(workspaceId, account.marketplaceKey, account.country, id);

    const updated = await this.repository.update(id, workspaceId, {
      isDefault: true,
      updatedBy: opts?.updatedBy ?? null,
    }) as unknown as IMarketplaceAccount;

    await this.audit.log(updated, AccountEvent.DEFAULT_CHANGED, { changedBy: opts?.updatedBy });
    await this.publishEvent(AccountEvent.DEFAULT_CHANGED, updated);

    return updated;
  }

  // ── Set Priority ──────────────────────────────────────────

  async setAccountPriority(id: string, workspaceId: string, priority: number, opts?: { updatedBy?: string | null }): Promise<IMarketplaceAccount> {
    const account = await this.requireAccount(id, workspaceId);
    this.statusManager.assertMutable(account);

    const updated = await this.repository.update(id, workspaceId, {
      priority,
      updatedBy: opts?.updatedBy ?? null,
    }) as unknown as IMarketplaceAccount;

    await this.audit.log(updated, AccountEvent.UPDATED, { changedBy: opts?.updatedBy });
    await this.publishEvent(AccountEvent.UPDATED, updated);

    return updated;
  }

  // ── History ───────────────────────────────────────────────

  async getHistory(
    id: string,
    workspaceId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<{ items: IMarketplaceAccountHistory[]; total: number }> {
    await this.requireAccount(id, workspaceId);
    const [items, total] = await this.repository.findHistory(id, workspaceId, opts);
    return { items: items as unknown as IMarketplaceAccountHistory[], total };
  }

  // ── Helpers ───────────────────────────────────────────────

  private async requireAccount(id: string, workspaceId: string): Promise<IMarketplaceAccount> {
    const account = await this.repository.findById(id, workspaceId);
    if (!account) {
      throw new NotFoundException({
        message: `Marketplace account '${id}' not found`,
        code: MP_ACCOUNT_ERROR_CODES.NOT_FOUND,
      });
    }
    return account as unknown as IMarketplaceAccount;
  }

  private async transition(
    account: IMarketplaceAccount,
    to: AccountStatus,
    changedBy?: string | null,
    reason?: string,
  ): Promise<IMarketplaceAccount> {
    const updated = await this.repository.update(account.id, account.workspaceId, {
      status: to,
      updatedBy: changedBy ?? null,
    }) as unknown as IMarketplaceAccount;

    await this.audit.log(updated, `status:${account.status}→${to}`, {
      fromStatus: account.status,
      toStatus: to,
      reason: reason ?? null,
      changedBy: changedBy ?? null,
    });

    return updated;
  }

  private async publishEvent(event: AccountEvent, account: IMarketplaceAccount): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      accountId: account.id,
      workspaceId: account.workspaceId,
      providerKey: account.providerKey,
      marketplaceKey: account.marketplaceKey,
      externalAccountId: account.externalAccountId,
      status: account.status,
      isDefault: account.isDefault,
      timestamp: new Date(),
    });
  }
}
