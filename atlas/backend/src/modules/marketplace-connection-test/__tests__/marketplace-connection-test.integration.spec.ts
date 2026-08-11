import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MarketplaceConnectionTestService } from '../marketplace-connection-test.service';
import { ConnectionTestValidator } from '../validator/connection-test.validator';
import { ConnectionTestResultManager } from '../result/connection-test-result.manager';
import { ConnectionTestEventQueue } from '../events/connection-test-events.queue';
import { ConnectionTestRunner } from '../runner/connection-test.runner';
import { ConnectionTestRepository } from '../repository/connection-test.repository';
import {
  ConnectionAuthStatus,
  ConnectionCapabilityStatus,
  ConnectionErrorCategory,
  ConnectionStatus,
  ConnectionTestEvent,
  ConnectionTestResult,
  ConnectionTestTrigger,
  IConnectionTestRecord,
} from '../interfaces';

// ── In-Memory Fake Repository ─────────────────────────────────

class FakeConnectionTestRepository {
  private records = new Map<string, Record<string, unknown>>();
  private history: Record<string, unknown>[] = [];
  private idSeq = 0;

  async create(data: Record<string, unknown>) {
    const rec = { id: `rec-${++this.idSeq}`, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
    this.records.set(rec['id'] as string, rec);
    this.history.push(rec);
    return rec;
  }

  async findById(id: string, workspaceId: string) {
    const r = this.records.get(id);
    return r && r['workspaceId'] === workspaceId && !r['deletedAt'] ? r : null;
  }

  async findByCorrelationId(correlationId: string) {
    for (const r of this.records.values()) {
      if (r['correlationId'] === correlationId && !r['deletedAt']) return r;
    }
    return null;
  }

  async findHistory(filter: { workspaceId: string; providerKey?: string | null }) {
    const items = this.history.filter((h) => {
      if (h['workspaceId'] !== filter.workspaceId) return false;
      if (filter.providerKey && h['providerKey'] !== filter.providerKey.toUpperCase()) return false;
      return true;
    });
    return [items, items.length] as [Record<string, unknown>[], number];
  }

  async softDelete(id: string) {
    const r = this.records.get(id);
    if (r) this.records.set(id, { ...r, deletedAt: new Date() });
  }

  get allRecords() { return this.history; }
}

// ── Fake Adapter ──────────────────────────────────────────────

function makeAdapter(status: 'HEALTHY' | 'UNHEALTHY' = 'HEALTHY', latencyMs = 100) {
  return {
    metadata: { providerKey: 'AMAZON_SP' },
    testConnection: jest.fn().mockResolvedValue({
      providerKey: 'AMAZON_SP',
      status,
      latencyMs,
      message: '',
      checkedAt: new Date(),
    }),
  };
}

// ── Setup ─────────────────────────────────────────────────────

function buildService(opts: {
  adapterStatus?: 'HEALTHY' | 'UNHEALTHY';
  registeredProviders?: string[];
  adapterError?: Error | null;
}) {
  const repo = new FakeConnectionTestRepository();
  const eventQueue = { enqueue: jest.fn().mockResolvedValue(undefined), events: [] as Record<string, unknown>[] };
  eventQueue.enqueue.mockImplementation((p: Record<string, unknown>) => { eventQueue.events.push(p); return Promise.resolve(); });

  const adapter = opts.adapterError
    ? { metadata: { providerKey: 'AMAZON_SP' }, testConnection: jest.fn().mockRejectedValue(opts.adapterError) }
    : makeAdapter(opts.adapterStatus ?? 'HEALTHY');

  const providers = opts.registeredProviders ?? ['AMAZON_SP', 'FLIPKART'];
  const registry = {
    isRegistered: jest.fn((k: string) => providers.includes(k.toUpperCase())),
    get: jest.fn().mockReturnValue(adapter),
    getActive: jest.fn().mockReturnValue(providers.map((p) => ({ ...adapter, metadata: { providerKey: p } }))),
  };

  const healthService = { checkProvider: jest.fn().mockResolvedValue({}) };
  const runner = new ConnectionTestRunner();
  const resultManager = new ConnectionTestResultManager(repo as any);
  const validator = new ConnectionTestValidator();

  const service = new MarketplaceConnectionTestService(
    validator,
    resultManager,
    eventQueue as any,
    runner,
    repo as any,
    registry as any,
    healthService as any,
  );

  return { service, repo, eventQueue, registry, healthService, resultManager };
}

// ── Integration Suite ─────────────────────────────────────────

describe('MarketplaceConnectionTestService — Integration', () => {

  // ── Successful test ───────────────────────────────────────

  it('returns success=true for healthy registered provider', async () => {
    const { service } = buildService({});
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.success).toBe(true);
    expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
    expect(result.authStatus).toBe(ConnectionAuthStatus.AUTHENTICATED);
  });

  it('persists result to repository', async () => {
    const { service, repo } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(repo.allRecords.length).toBe(1);
  });

  it('uses provided correlationId', async () => {
    const { service } = buildService({});
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', correlationId: 'my-corr' });
    expect(result.correlationId).toBe('my-corr');
  });

  it('generates correlationId when not provided', async () => {
    const { service } = buildService({});
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.correlationId).toBeTruthy();
    expect(result.correlationId.length).toBeGreaterThan(8);
  });

  // ── Failure test ──────────────────────────────────────────

  it('returns success=false for unhealthy provider', async () => {
    const { service } = buildService({ adapterStatus: 'UNHEALTHY' });
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.success).toBe(false);
  });

  it('returns CONFIGURATION error for unregistered provider', async () => {
    const { service } = buildService({ registeredProviders: [] });
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'UNKNOWN' });
    expect(result.success).toBe(false);
    expect(result.errorCategory).toBe(ConnectionErrorCategory.CONFIGURATION);
    expect(result.retryable).toBe(false);
  });

  it('classifies auth error correctly', async () => {
    const { service } = buildService({ adapterError: new Error('401 unauthorized') });
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.errorCategory).toBe(ConnectionErrorCategory.AUTHENTICATION);
    expect(result.retryable).toBe(false);
  });

  // ── Deduplication ─────────────────────────────────────────

  it('throws ConflictException for duplicate in-progress test', async () => {
    const { service, resultManager } = buildService({});
    resultManager.lock('ws-1', 'AMAZON_SP', 'corr-existing');
    await expect(
      service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' }),
    ).rejects.toThrow(ConflictException);
  });

  // ── Events ────────────────────────────────────────────────

  it('emits STARTED event before result', async () => {
    const { service, eventQueue } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(eventQueue.events[0]['event']).toBe(ConnectionTestEvent.STARTED);
  });

  it('emits SUCCEEDED event on success', async () => {
    const { service, eventQueue } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(eventQueue.events.some((e) => e['event'] === ConnectionTestEvent.SUCCEEDED)).toBe(true);
  });

  it('emits FAILED event on failure', async () => {
    const { service, eventQueue } = buildService({ adapterError: new Error('network error') });
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(eventQueue.events.some((e) => e['event'] === ConnectionTestEvent.FAILED)).toBe(true);
  });

  // ── Health sync ───────────────────────────────────────────

  it('syncs health monitoring after test', async () => {
    const { service, healthService } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(healthService.checkProvider).toHaveBeenCalled();
  });

  // ── Validation ────────────────────────────────────────────

  it('throws BadRequestException when workspaceId is missing', async () => {
    const { service } = buildService({});
    await expect(service.test({ workspaceId: '', providerKey: 'AMAZON_SP' })).rejects.toThrow(BadRequestException);
  });

  // ── History ───────────────────────────────────────────────

  it('getHistory returns persisted results', async () => {
    const { service } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    const history = await service.getHistory({ workspaceId: 'ws-1' });
    expect(history.total).toBe(1);
  });

  it('getById returns result by id', async () => {
    const { service, repo } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    const id = repo.allRecords[0]['id'] as string;
    const record = await service.getById(id, 'ws-1');
    expect(record.id).toBe(id);
  });

  it('getById throws NotFoundException for unknown id', async () => {
    const { service } = buildService({});
    await expect(service.getById('nonexistent', 'ws-1')).rejects.toThrow(NotFoundException);
  });

  it('getByCorrelationId returns result by correlationId', async () => {
    const { service } = buildService({});
    await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', correlationId: 'test-corr' });
    const record = await service.getByCorrelationId('test-corr');
    expect(record.correlationId).toBe('test-corr');
  });

  // ── Bulk test ─────────────────────────────────────────────

  it('testAll runs for all active providers', async () => {
    const { service } = buildService({ registeredProviders: ['AMAZON_SP', 'FLIPKART'] });
    const results = await service.testAll('ws-1');
    expect(results.length).toBe(2);
  });

  // ── Workspace isolation ───────────────────────────────────

  it('workspace isolation: results are scoped', async () => {
    const { service } = buildService({});
    await service.test({ workspaceId: 'ws-A', providerKey: 'AMAZON_SP' });
    await service.test({ workspaceId: 'ws-B', providerKey: 'AMAZON_SP' });
    const histA = await service.getHistory({ workspaceId: 'ws-A' });
    const histB = await service.getHistory({ workspaceId: 'ws-B' });
    expect(histA.total).toBe(1);
    expect(histB.total).toBe(1);
  });

  // ── Security ─────────────────────────────────────────────

  it('never exposes credentials in error messages', async () => {
    const { service } = buildService({ adapterError: new Error('Auth failed: secret=MY_SECRET token=MY_TOKEN') });
    const result = await service.test({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.errorMessage).not.toContain('MY_SECRET');
    expect(result.errorMessage).not.toContain('MY_TOKEN');
    expect(result.errorMessage).toContain('***');
  });
});
