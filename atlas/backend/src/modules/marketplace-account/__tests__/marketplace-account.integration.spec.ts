import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MarketplaceAccountService } from '../marketplace-account.service';
import { AccountValidator } from '../validator/account.validator';
import { AccountStatusManager } from '../status/account-status.manager';
import { AccountAudit } from '../audit/account.audit';
import { AccountEventQueue } from '../events/account-events.queue';
import { AccountConfigurationResolver } from '../config/account-configuration.resolver';
import {
  AccountEvent,
  AccountStatus,
  IMarketplaceAccount,
} from '../interfaces';
import { ConnectionTestTrigger } from '../../marketplace-connection-test/interfaces';

// ── Fake Repository ───────────────────────────────────────────

class FakeAccountRepository {
  private records = new Map<string, Record<string, unknown>>();
  private historyLog: Record<string, unknown>[] = [];
  private idSeq = 0;

  async create(data: Record<string, unknown>) {
    const id = `acc-${++this.idSeq}`;
    const rec = {
      id,
      version: 1,
      isDefault: false,
      priority: 0,
      status: AccountStatus.DRAFT,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    this.records.set(id, rec);
    return rec;
  }

  async findById(id: string, workspaceId: string) {
    const r = this.records.get(id);
    return r && r['workspaceId'] === workspaceId && !r['deletedAt'] ? { ...r } : null;
  }

  async findByExternalAccountId(workspaceId: string, providerKey: string, externalAccountId: string) {
    for (const r of this.records.values()) {
      if (
        r['workspaceId'] === workspaceId &&
        r['providerKey'] === providerKey.toUpperCase() &&
        r['externalAccountId'] === externalAccountId &&
        !r['deletedAt']
      ) return { ...r };
    }
    return null;
  }

  async findDefault(workspaceId: string, marketplaceKey: string, country?: string | null) {
    for (const r of this.records.values()) {
      if (
        r['workspaceId'] === workspaceId &&
        r['marketplaceKey'] === marketplaceKey.toUpperCase() &&
        r['country'] === (country ?? null) &&
        r['isDefault'] === true &&
        !r['deletedAt']
      ) return { ...r };
    }
    return null;
  }

  async findMany(filter: { workspaceId: string; providerKey?: string | null; marketplaceKey?: string | null; status?: string | null; isDefault?: boolean | null; search?: string | null; page?: number; limit?: number }) {
    let items = [...this.records.values()].filter(
      (r) => r['workspaceId'] === filter.workspaceId && !r['deletedAt'],
    );
    if (filter.providerKey) items = items.filter((r) => r['providerKey'] === filter.providerKey!.toUpperCase());
    if (filter.marketplaceKey) items = items.filter((r) => r['marketplaceKey'] === filter.marketplaceKey!.toUpperCase());
    if (filter.status) items = items.filter((r) => r['status'] === filter.status);
    if (filter.isDefault !== undefined && filter.isDefault !== null) items = items.filter((r) => r['isDefault'] === filter.isDefault);
    if (filter.search) items = items.filter((r) => String(r['accountName']).includes(filter.search!));
    const total = items.length;
    const limit = filter.limit ?? 20;
    const page = filter.page ?? 1;
    return [items.slice((page - 1) * limit, page * limit), total] as [Record<string, unknown>[], number];
  }

  async update(id: string, workspaceId: string, data: Record<string, unknown>, expectedVersion?: number) {
    const existing = this.records.get(id);
    if (!existing || existing['workspaceId'] !== workspaceId) throw new Error('Optimistic lock conflict or record not found');
    if (expectedVersion !== undefined && existing['version'] !== expectedVersion) throw new Error('Optimistic lock conflict or record not found');
    const updated = { ...existing, ...data, version: (existing['version'] as number) + 1, updatedAt: new Date() };
    this.records.set(id, updated);
    return { ...updated };
  }

  async softDelete(id: string, workspaceId: string) {
    const existing = this.records.get(id);
    if (existing && existing['workspaceId'] === workspaceId) {
      this.records.set(id, { ...existing, deletedAt: new Date() });
    }
  }

  async clearDefault(workspaceId: string, marketplaceKey: string, country?: string | null, excludeId?: string) {
    for (const [id, r] of this.records.entries()) {
      if (
        r['workspaceId'] === workspaceId &&
        r['marketplaceKey'] === marketplaceKey.toUpperCase() &&
        r['country'] === (country ?? null) &&
        r['isDefault'] === true &&
        id !== excludeId
      ) {
        this.records.set(id, { ...r, isDefault: false });
      }
    }
  }

  async createHistory(data: Record<string, unknown>) {
    const rec = { id: `hist-${this.historyLog.length + 1}`, createdAt: new Date(), ...data };
    this.historyLog.push(rec);
    return rec;
  }

  async findHistory(accountId: string, workspaceId: string, opts?: { page?: number; limit?: number }) {
    const items = this.historyLog.filter((h) => h['accountId'] === accountId && h['workspaceId'] === workspaceId);
    return [items, items.length] as [Record<string, unknown>[], number];
  }

  get allHistory() { return this.historyLog; }
  get allRecords() { return [...this.records.values()]; }
}

// ── Setup Factory ─────────────────────────────────────────────

function buildService(opts: {
  connectionTestSuccess?: boolean;
  connectionTestError?: string | null;
  providerRegistered?: boolean;
}) {
  const repo = new FakeAccountRepository();
  const events: AccountEvent[] = [];
  const eventQueue: { enqueue: jest.Mock; events: AccountEvent[] } = {
    events,
    enqueue: jest.fn().mockImplementation((p: { event: AccountEvent }) => { events.push(p.event); return Promise.resolve(); }),
  };

  const providerRegistered = opts.providerRegistered ?? true;
  const registry = { isRegistered: jest.fn().mockReturnValue(providerRegistered) };

  const connectionTestSuccess = opts.connectionTestSuccess ?? true;
  const connectionTestService = {
    test: jest.fn().mockResolvedValue({
      success: connectionTestSuccess,
      correlationId: 'test-corr-1',
      testedAt: new Date(),
      errorMessage: connectionTestSuccess ? null : (opts.connectionTestError ?? 'Connection failed'),
      errorCode: connectionTestSuccess ? null : 'CONN_TEST_FAILED',
      retryable: false,
    }),
  };

  const validator = new AccountValidator();
  const statusManager = new AccountStatusManager();
  const configResolver = new AccountConfigurationResolver(registry as any);
  const audit = new AccountAudit(repo as any);

  const service = new MarketplaceAccountService(
    repo as any,
    validator,
    statusManager,
    configResolver,
    eventQueue as any,
    audit,
    connectionTestService as any,
  );

  return { service, repo, eventQueue, connectionTestService };
}

const BASE_CREATE = {
  workspaceId: 'ws-1',
  providerKey: 'AMAZON_SP',
  marketplaceKey: 'AMAZON_IN',
  accountName: 'Test Account',
  externalAccountId: 'ext-abc-123',
  country: 'IN',
};

// ── Integration Suite ─────────────────────────────────────────

describe('MarketplaceAccountService — Integration', () => {

  // ── Create ────────────────────────────────────────────────

  it('creates account with DRAFT status', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    expect(account.status).toBe(AccountStatus.DRAFT);
    expect(account.isDefault).toBe(false);
    expect(account.providerKey).toBe('AMAZON_SP');
  });

  it('uppercases providerKey and marketplaceKey', async () => {
    const { service } = buildService({});
    const account = await service.createAccount({ ...BASE_CREATE, providerKey: 'amazon_sp', marketplaceKey: 'amazon_in' });
    expect(account.providerKey).toBe('AMAZON_SP');
    expect(account.marketplaceKey).toBe('AMAZON_IN');
  });

  it('throws BadRequestException for missing required fields', async () => {
    const { service } = buildService({});
    await expect(service.createAccount({ ...BASE_CREATE, workspaceId: '' })).rejects.toThrow(BadRequestException);
  });

  it('throws UnprocessableEntityException when provider not registered', async () => {
    const { service } = buildService({ providerRegistered: false });
    await expect(service.createAccount(BASE_CREATE)).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws ConflictException for duplicate externalAccountId', async () => {
    const { service } = buildService({});
    await service.createAccount(BASE_CREATE);
    await expect(service.createAccount(BASE_CREATE)).rejects.toThrow(ConflictException);
  });

  it('allows same externalAccountId in different workspaces', async () => {
    const { service } = buildService({});
    await service.createAccount(BASE_CREATE);
    const second = await service.createAccount({ ...BASE_CREATE, workspaceId: 'ws-2' });
    expect(second.id).toBeTruthy();
  });

  it('emits CREATED event after creation', async () => {
    const { service, eventQueue } = buildService({});
    await service.createAccount(BASE_CREATE);
    expect(eventQueue.events).toContain(AccountEvent.CREATED);
  });

  it('persists audit history on create', async () => {
    const { service, repo } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    const { items } = await service.getHistory(account.id, account.workspaceId);
    expect(items.length).toBeGreaterThan(0);
  });

  // ── Find ──────────────────────────────────────────────────

  it('findById returns account', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    const found = await service.findById(account.id, account.workspaceId);
    expect(found.id).toBe(account.id);
  });

  it('findById throws NotFoundException for unknown id', async () => {
    const { service } = buildService({});
    await expect(service.findById('nonexistent', 'ws-1')).rejects.toThrow(NotFoundException);
  });

  it('findAll returns paginated accounts', async () => {
    const { service } = buildService({});
    await service.createAccount(BASE_CREATE);
    await service.createAccount({ ...BASE_CREATE, externalAccountId: 'ext-2' });
    const result = await service.findAll({ workspaceId: 'ws-1' });
    expect(result.total).toBe(2);
    expect(result.items.length).toBe(2);
  });

  it('findAll filters by providerKey', async () => {
    const { service } = buildService({});
    await service.createAccount(BASE_CREATE);
    await service.createAccount({ ...BASE_CREATE, providerKey: 'FLIPKART', externalAccountId: 'ext-flip' });
    const result = await service.findAll({ workspaceId: 'ws-1', providerKey: 'FLIPKART' });
    expect(result.total).toBe(1);
    expect(result.items[0].providerKey).toBe('FLIPKART');
  });

  it('findAll filters by status', async () => {
    const { service } = buildService({});
    await service.createAccount(BASE_CREATE);
    const result = await service.findAll({ workspaceId: 'ws-1', status: AccountStatus.DRAFT });
    expect(result.total).toBe(1);
    expect(result.items[0].status).toBe(AccountStatus.DRAFT);
  });

  it('findAll search by accountName', async () => {
    const { service } = buildService({});
    await service.createAccount({ ...BASE_CREATE, accountName: 'Alpha Account' });
    await service.createAccount({ ...BASE_CREATE, accountName: 'Beta Account', externalAccountId: 'ext-2' });
    const result = await service.findAll({ workspaceId: 'ws-1', search: 'Alpha' });
    expect(result.total).toBe(1);
    expect(result.items[0].accountName).toBe('Alpha Account');
  });

  // ── Update ────────────────────────────────────────────────

  it('updates mutable account fields', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    const updated = await service.updateAccount(account.id, account.workspaceId, { accountName: 'Updated Name' });
    expect(updated.accountName).toBe('Updated Name');
  });

  it('throws BadRequestException for invalid update', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    await expect(service.updateAccount(account.id, account.workspaceId, { accountName: '' })).rejects.toThrow(BadRequestException);
  });

  it('emits UPDATED event after update', async () => {
    const { service, eventQueue } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    eventQueue.events.length = 0;
    await service.updateAccount(account.id, account.workspaceId, { accountName: 'New Name' });
    expect(eventQueue.events).toContain(AccountEvent.UPDATED);
  });

  // ── Enable / Lifecycle ────────────────────────────────────

  it('enableAccount transitions DRAFT → ACTIVE via connection test', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    expect(active.status).toBe(AccountStatus.ACTIVE);
    expect(active.lastTestSuccess).toBe(true);
  });

  it('enableAccount marks INVALID when connection test fails', async () => {
    const { service } = buildService({ connectionTestSuccess: false });
    const account = await service.createAccount(BASE_CREATE);
    await expect(service.enableAccount(account.id, account.workspaceId)).rejects.toThrow(UnprocessableEntityException);
    const updated = await service.findById(account.id, account.workspaceId);
    expect(updated.status).toBe(AccountStatus.INVALID);
  });

  it('emits ACTIVATED event on enable', async () => {
    const { service, eventQueue } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    eventQueue.events.length = 0;
    await service.enableAccount(account.id, account.workspaceId);
    expect(eventQueue.events).toContain(AccountEvent.ACTIVATED);
  });

  it('emits INVALID event when connection test fails', async () => {
    const { service, eventQueue } = buildService({ connectionTestSuccess: false });
    const account = await service.createAccount(BASE_CREATE);
    eventQueue.events.length = 0;
    try { await service.enableAccount(account.id, account.workspaceId); } catch { /* expected */ }
    expect(eventQueue.events).toContain(AccountEvent.INVALID);
  });

  // ── Disable ───────────────────────────────────────────────

  it('disableAccount transitions ACTIVE → DISABLED', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    const disabled = await service.disableAccount(active.id, active.workspaceId, { reason: 'Maintenance' });
    expect(disabled.status).toBe(AccountStatus.DISABLED);
  });

  it('emits DISABLED event on disable', async () => {
    const { service, eventQueue } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    eventQueue.events.length = 0;
    await service.disableAccount(active.id, active.workspaceId);
    expect(eventQueue.events).toContain(AccountEvent.DISABLED);
  });

  // ── Archive ───────────────────────────────────────────────

  it('archiveAccount transitions ACTIVE → ARCHIVED', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    const archived = await service.archiveAccount(active.id, active.workspaceId);
    expect(archived.status).toBe(AccountStatus.ARCHIVED);
  });

  it('emits ARCHIVED event', async () => {
    const { service, eventQueue } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    eventQueue.events.length = 0;
    await service.archiveAccount(active.id, active.workspaceId);
    expect(eventQueue.events).toContain(AccountEvent.ARCHIVED);
  });

  // ── Restore ───────────────────────────────────────────────

  it('restoreAccount transitions ARCHIVED → DRAFT', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    const archived = await service.archiveAccount(active.id, active.workspaceId);
    const restored = await service.restoreAccount(archived.id, archived.workspaceId);
    expect(restored.status).toBe(AccountStatus.DRAFT);
  });

  it('emits RESTORED event', async () => {
    const { service, eventQueue } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    const archived = await service.archiveAccount(active.id, active.workspaceId);
    eventQueue.events.length = 0;
    await service.restoreAccount(archived.id, archived.workspaceId);
    expect(eventQueue.events).toContain(AccountEvent.RESTORED);
  });

  // ── Delete ────────────────────────────────────────────────

  it('deleteAccount soft-deletes account', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    await service.deleteAccount(account.id, account.workspaceId);
    await expect(service.findById(account.id, account.workspaceId)).rejects.toThrow(NotFoundException);
  });

  it('emits DELETED event on delete', async () => {
    const { service, eventQueue } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    eventQueue.events.length = 0;
    await service.deleteAccount(account.id, account.workspaceId);
    expect(eventQueue.events).toContain(AccountEvent.DELETED);
  });

  // ── Test Connection ───────────────────────────────────────

  it('testConnection returns success=true', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const result = await service.testConnection(account.id, account.workspaceId);
    expect(result.success).toBe(true);
    expect(result.correlationId).toBeTruthy();
  });

  it('testConnection persists lastTestedAt on account', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    await service.testConnection(account.id, account.workspaceId);
    const updated = await service.findById(account.id, account.workspaceId);
    expect(updated.lastTestedAt).toBeTruthy();
    expect(updated.lastTestSuccess).toBe(true);
  });

  // ── Set Default ───────────────────────────────────────────

  it('setDefaultAccount sets isDefault on ACTIVE account', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    const defaulted = await service.setDefaultAccount(active.id, active.workspaceId);
    expect(defaulted.isDefault).toBe(true);
  });

  it('setDefaultAccount throws for non-ACTIVE account', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    await expect(service.setDefaultAccount(account.id, account.workspaceId)).rejects.toThrow(UnprocessableEntityException);
  });

  it('only one default per marketplace+country+workspace', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const a1 = await service.createAccount({ ...BASE_CREATE, externalAccountId: 'ext-1' });
    const a2 = await service.createAccount({ ...BASE_CREATE, externalAccountId: 'ext-2' });
    const active1 = await service.enableAccount(a1.id, a1.workspaceId);
    const active2 = await service.enableAccount(a2.id, a2.workspaceId);
    await service.setDefaultAccount(active1.id, active1.workspaceId);
    await service.setDefaultAccount(active2.id, active2.workspaceId);
    const updated1 = await service.findById(active1.id, active1.workspaceId);
    expect(updated1.isDefault).toBe(false);
    const updated2 = await service.findById(active2.id, active2.workspaceId);
    expect(updated2.isDefault).toBe(true);
  });

  it('emits DEFAULT_CHANGED event', async () => {
    const { service, eventQueue } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    eventQueue.events.length = 0;
    await service.setDefaultAccount(active.id, active.workspaceId);
    expect(eventQueue.events).toContain(AccountEvent.DEFAULT_CHANGED);
  });

  // ── Set Priority ──────────────────────────────────────────

  it('setAccountPriority updates priority', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    const updated = await service.setAccountPriority(account.id, account.workspaceId, 50);
    expect(updated.priority).toBe(50);
  });

  it('setAccountPriority throws for ACTIVE account (immutable)', async () => {
    const { service } = buildService({ connectionTestSuccess: true });
    const account = await service.createAccount(BASE_CREATE);
    const active = await service.enableAccount(account.id, account.workspaceId);
    await expect(service.setAccountPriority(active.id, active.workspaceId, 10)).rejects.toThrow();
  });

  // ── History ───────────────────────────────────────────────

  it('getHistory returns audit log entries', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    await service.updateAccount(account.id, account.workspaceId, { accountName: 'Updated' });
    const { items, total } = await service.getHistory(account.id, account.workspaceId);
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it('getHistory throws NotFoundException for unknown account', async () => {
    const { service } = buildService({});
    await expect(service.getHistory('nonexistent', 'ws-1')).rejects.toThrow(NotFoundException);
  });

  // ── Workspace Isolation ───────────────────────────────────

  it('workspace isolation: cannot access another workspace account', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    await expect(service.findById(account.id, 'ws-other')).rejects.toThrow(NotFoundException);
  });

  it('workspace isolation: findAll only returns own workspace accounts', async () => {
    const { service } = buildService({});
    await service.createAccount({ ...BASE_CREATE, workspaceId: 'ws-A' });
    await service.createAccount({ ...BASE_CREATE, workspaceId: 'ws-B' });
    const result = await service.findAll({ workspaceId: 'ws-A' });
    expect(result.total).toBe(1);
    expect(result.items[0].workspaceId).toBe('ws-A');
  });

  // ── Security ─────────────────────────────────────────────

  it('credentialRef is not exposed in connection test error messages', async () => {
    const { service } = buildService({ connectionTestSuccess: false, connectionTestError: 'token=MYSECRET' });
    const account = await service.createAccount({ ...BASE_CREATE, credentialRef: 'cred-ref-secret' });
    let caughtError: Error | undefined;
    try {
      await service.enableAccount(account.id, account.workspaceId);
    } catch (err) {
      caughtError = err as Error;
    }
    // The error thrown must not contain the credential ref value
    const errMsg = JSON.stringify(caughtError);
    expect(errMsg).not.toContain('cred-ref-secret');
  });

  it('audit history snapshot does not include credentialRef', async () => {
    const { service, repo } = buildService({});
    await service.createAccount({ ...BASE_CREATE, credentialRef: 'super-secret-cred' });
    const historyEntry = repo.allHistory[0] as { snapshot: Record<string, unknown> };
    expect(historyEntry.snapshot?.credentialRef).toBeUndefined();
  });

  // ── Optimistic Concurrency ────────────────────────────────

  it('update with wrong expectedVersion throws', async () => {
    const { service } = buildService({});
    const account = await service.createAccount(BASE_CREATE);
    await expect(
      service.updateAccount(account.id, account.workspaceId, { accountName: 'X', expectedVersion: 999 }),
    ).rejects.toThrow();
  });
});
