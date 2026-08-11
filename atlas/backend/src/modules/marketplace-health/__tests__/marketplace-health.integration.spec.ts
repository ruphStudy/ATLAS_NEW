import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceHealthService } from '../marketplace-health.service';
import { MarketplaceHealthMonitorService } from '../monitor/marketplace-health-monitor.service';
import { MarketplaceHealthStatusManager } from '../status/marketplace-health-status.manager';
import { MarketplaceHealthMetrics } from '../metrics/marketplace-health.metrics';
import { MarketplaceHealthCheckScheduler } from '../scheduler/marketplace-health-check.scheduler';
import {
  HealthCheckResult,
  HealthCheckTrigger,
  HealthConnectionStatus,
  HealthAuthStatus,
  MarketplaceHealthState,
  MarketplaceHealthEvent,
  IHealthRecord,
} from '../interfaces';

// ── In-Memory Fake Repository ─────────────────────────────────

class FakeHealthRepository {
  private records = new Map<string, Record<string, unknown>>();
  private history: Record<string, unknown>[] = [];
  private auditLogs: Record<string, unknown>[] = [];
  private idSeq = 0;

  private key(ws: string, pk: string, acct: string | null | undefined) {
    return `${ws}:${pk.toUpperCase()}:${acct ?? 'any'}`;
  }

  async upsertRecord(data: Record<string, unknown>) {
    const k = this.key(data['workspaceId'] as string, data['providerKey'] as string, data['accountId'] as string | null);
    const existing = this.records.get(k);
    const rec = { id: existing ? (existing['id'] as string) : `rec-${++this.idSeq}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    this.records.set(k, rec);
    return rec;
  }

  async findRecord(ws: string, pk: string, acct?: string | null) {
    return this.records.get(this.key(ws, pk, acct)) ?? null;
  }

  async findAllRecords(ws: string) {
    return [...this.records.values()].filter((r) => r['workspaceId'] === ws);
  }

  async softDeleteRecord() {}

  async createHistory(data: Record<string, unknown>) {
    this.history.push({ id: `h-${++this.idSeq}`, createdAt: new Date(), ...data });
    return this.history[this.history.length - 1];
  }

  async findHistory(filter: { workspaceId: string; providerKey?: string | null; page?: number; limit?: number }) {
    const items = this.history.filter((h) => {
      if (h['workspaceId'] !== filter.workspaceId) return false;
      if (filter.providerKey && h['providerKey'] !== filter.providerKey.toUpperCase()) return false;
      return true;
    });
    return [items, items.length] as [Record<string, unknown>[], number];
  }

  async createAuditLog(data: Record<string, unknown>) {
    this.auditLogs.push(data);
  }

  get allHistory() { return this.history; }
  get allAuditLogs() { return this.auditLogs; }
}

// ── Fake Provider Registry ────────────────────────────────────

function makeFakeRegistry(providers: string[], healthy = true) {
  const adapter = (key: string) => ({
    metadata: { providerKey: key },
    healthCheck: jest.fn().mockResolvedValue({ status: healthy ? 'HEALTHY' : 'UNHEALTHY', latencyMs: 150 }),
  });
  return {
    isRegistered: (k: string) => providers.includes(k),
    get: (k: string) => adapter(k),
    getActive: () => providers.map(adapter),
  };
}

// ── Helpers ───────────────────────────────────────────────────

function makeResult(overrides?: Partial<HealthCheckResult>): HealthCheckResult {
  return {
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    accountId: null,
    healthState: MarketplaceHealthState.HEALTHY,
    connectionStatus: HealthConnectionStatus.CONNECTED,
    authStatus: HealthAuthStatus.AUTHENTICATED,
    apiReachable: true,
    responseTimeMs: 200,
    errorRate: 0,
    rateLimitRemaining: 1000,
    rateLimitReset: null,
    consecutiveFailures: 0,
    consecutiveSuccess: 1,
    lastError: null,
    checkedAt: new Date(),
    ...overrides,
  };
}

// ── Integration Suite ─────────────────────────────────────────

describe('MarketplaceHealthService — Integration', () => {
  let service: MarketplaceHealthService;
  let metrics: MarketplaceHealthMetrics;
  let fakeRepo: FakeHealthRepository;
  let fakeEventQueue: { enqueue: jest.Mock; events: Record<string, unknown>[] };
  let registry: ReturnType<typeof makeFakeRegistry>;

  beforeEach(async () => {
    fakeRepo = new FakeHealthRepository();
    fakeEventQueue = {
      enqueue: jest.fn().mockImplementation((p) => { fakeEventQueue.events.push(p); return Promise.resolve(); }),
      events: [],
    };
    registry = makeFakeRegistry(['AMAZON_SP', 'FLIPKART']);
    metrics = new MarketplaceHealthMetrics();

    const statusManager = new MarketplaceHealthStatusManager(fakeRepo as any, fakeEventQueue as any);
    const monitor = new MarketplaceHealthMonitorService(registry as any, statusManager, metrics, fakeRepo as any);
    const scheduler = new MarketplaceHealthCheckScheduler(monitor);

    service = new MarketplaceHealthService(monitor, statusManager, metrics, fakeRepo as any, scheduler);
  });

  // ── Manual check ──────────────────────────────────────────

  it('manual check returns HEALTHY for registered healthy provider', async () => {
    const result = await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.healthState).toBe(MarketplaceHealthState.HEALTHY);
    expect(result.apiReachable).toBe(true);
  });

  it('manual check returns OFFLINE for unregistered provider', async () => {
    const result = await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'UNKNOWN' });
    expect(result.healthState).toBe(MarketplaceHealthState.OFFLINE);
  });

  it('checkAllForWorkspace checks all active providers', async () => {
    const results = await service.checkAllForWorkspace('ws-1');
    expect(results.length).toBe(2);
    expect(results.every((r) => r.healthState === MarketplaceHealthState.HEALTHY)).toBe(true);
  });

  // ── Status persistence ────────────────────────────────────

  it('getStatus returns current state after a check', async () => {
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    const status = await service.getStatus('ws-1', 'AMAZON_SP');
    expect(status?.healthState).toBe(MarketplaceHealthState.HEALTHY);
  });

  it('getAllStatuses returns all provider records for workspace', async () => {
    await service.checkAllForWorkspace('ws-1');
    const all = await service.getAllStatuses('ws-1');
    expect(all.length).toBe(2);
  });

  // ── Dashboard ─────────────────────────────────────────────

  it('getDashboard returns entries with metrics', async () => {
    await service.checkAllForWorkspace('ws-1');
    const dashboard = await service.getDashboard('ws-1');
    expect(dashboard.length).toBe(2);
    expect(dashboard[0]).toHaveProperty('metrics');
    expect(dashboard[0].metrics.uptimePercent).toBeGreaterThanOrEqual(0);
  });

  // ── History ───────────────────────────────────────────────

  it('getHistory returns paginated history entries', async () => {
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    const result = await service.getHistory({ workspaceId: 'ws-1' });
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  // ── Events ────────────────────────────────────────────────

  it('emits UP event on first successful check', async () => {
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeEventQueue.events.some((e) => e['event'] === MarketplaceHealthEvent.UP)).toBe(true);
  });

  it('emits DOWN event when provider goes unhealthy', async () => {
    // First: healthy
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    // Second: unhealthy adapter
    (registry.get as jest.Mock) = jest.fn().mockReturnValue({
      metadata: { providerKey: 'AMAZON_SP' },
      healthCheck: jest.fn().mockResolvedValue({ status: 'UNHEALTHY', latencyMs: 200 }),
    });
    registry.isRegistered = jest.fn().mockReturnValue(true);
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeEventQueue.events.some((e) => e['event'] === MarketplaceHealthEvent.DOWN)).toBe(true);
  });

  it('emits RESTORED event when provider recovers', async () => {
    // Unhealthy → HEALTHY
    (registry.get as jest.Mock) = jest.fn()
      .mockReturnValueOnce({
        metadata: { providerKey: 'AMAZON_SP' },
        healthCheck: jest.fn().mockResolvedValue({ status: 'UNHEALTHY', latencyMs: 200 }),
      })
      .mockReturnValueOnce({
        metadata: { providerKey: 'AMAZON_SP' },
        healthCheck: jest.fn().mockResolvedValue({ status: 'HEALTHY', latencyMs: 100 }),
      });
    registry.isRegistered = jest.fn().mockReturnValue(true);
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeEventQueue.events.some((e) => e['event'] === MarketplaceHealthEvent.RESTORED)).toBe(true);
  });

  // ── Metrics ───────────────────────────────────────────────

  it('getMetrics returns snapshot for a provider', async () => {
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    const snap = service.getMetrics('ws-1', 'AMAZON_SP');
    expect(snap.totalChecks).toBeGreaterThanOrEqual(1);
    expect(snap.successRate).toBe(1);
  });

  it('getAllMetrics returns snapshots for all providers', async () => {
    await service.checkAllForWorkspace('ws-1');
    const snaps = service.getAllMetrics('ws-1');
    expect(snaps.length).toBe(2);
  });

  // ── Workspace isolation ───────────────────────────────────

  it('status is isolated per workspace', async () => {
    (registry.isRegistered as jest.Mock) = jest.fn().mockReturnValue(true);
    (registry.get as jest.Mock) = jest.fn()
      .mockImplementationOnce(() => ({
        metadata: { providerKey: 'AMAZON_SP' },
        healthCheck: jest.fn().mockResolvedValue({ status: 'HEALTHY', latencyMs: 100 }),
      }))
      .mockImplementationOnce(() => ({
        metadata: { providerKey: 'AMAZON_SP' },
        healthCheck: jest.fn().mockResolvedValue({ status: 'UNHEALTHY', latencyMs: 200 }),
      }));

    await service.checkProvider({ workspaceId: 'ws-A', providerKey: 'AMAZON_SP' });
    await service.checkProvider({ workspaceId: 'ws-B', providerKey: 'AMAZON_SP' });

    const wsA = await service.getStatus('ws-A', 'AMAZON_SP');
    const wsB = await service.getStatus('ws-B', 'AMAZON_SP');
    expect(wsA?.healthState).toBe(MarketplaceHealthState.HEALTHY);
    expect(wsB?.healthState).toBe(MarketplaceHealthState.UNHEALTHY);
  });

  // ── isHealthy helper ──────────────────────────────────────

  it('isHealthy returns true when provider is HEALTHY', async () => {
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(service.isHealthy('ws-1', 'AMAZON_SP')).toBe(true);
  });

  it('isHealthy returns true when provider is DEGRADED', async () => {
    (registry.isRegistered as jest.Mock) = jest.fn().mockReturnValue(true);
    (registry.get as jest.Mock) = jest.fn().mockReturnValue({
      metadata: { providerKey: 'AMAZON_SP' },
      healthCheck: jest.fn().mockResolvedValue({ status: 'HEALTHY', latencyMs: 4000 }), // slow → degraded
    });
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(service.isHealthy('ws-1', 'AMAZON_SP')).toBe(true);
  });

  // ── Security: no credentials in logs ─────────────────────

  it('never exposes credentials in persisted error messages', async () => {
    (registry.isRegistered as jest.Mock) = jest.fn().mockReturnValue(true);
    (registry.get as jest.Mock) = jest.fn().mockReturnValue({
      metadata: { providerKey: 'AMAZON_SP' },
      healthCheck: jest.fn().mockRejectedValue(new Error('Failed: secret=MYSECRETAPIKEY token=ABC123')),
    });
    await service.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', timeout: 100 });
    const status = await service.getStatus('ws-1', 'AMAZON_SP');
    expect(status?.lastError ?? '').not.toContain('MYSECRETAPIKEY');
    expect(status?.lastError ?? '').not.toContain('ABC123');
  });
});
