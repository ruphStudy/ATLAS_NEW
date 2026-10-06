import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceHealthMetrics } from '../metrics/marketplace-health.metrics';
import { MarketplaceHealthStatusManager } from '../status/marketplace-health-status.manager';
import { MarketplaceHealthMonitorService } from '../monitor/marketplace-health-monitor.service';
import { MarketplaceHealthCheckScheduler } from '../scheduler/marketplace-health-check.scheduler';
import {
  HealthCheckResult,
  HealthCheckTrigger,
  HealthConnectionStatus,
  HealthAuthStatus,
  MarketplaceHealthState,
  MarketplaceHealthEvent,
} from '../interfaces';

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

// ── Metrics Tests ─────────────────────────────────────────────

describe('MarketplaceHealthMetrics', () => {
  let metrics: MarketplaceHealthMetrics;

  beforeEach(() => {
    metrics = new MarketplaceHealthMetrics();
  });

  it('records a check result and returns snapshot', () => {
    metrics.record(makeResult({ responseTimeMs: 300 }));
    const snap = metrics.getSnapshot('ws-1', 'AMAZON_SP');
    expect(snap.totalChecks).toBe(1);
    expect(snap.avgResponseTimeMs).toBe(300);
    expect(snap.successRate).toBe(1);
    expect(snap.currentState).toBe(MarketplaceHealthState.HEALTHY);
  });

  it('tracks failure rate correctly', () => {
    metrics.record(makeResult());
    metrics.record(makeResult({ healthState: MarketplaceHealthState.UNHEALTHY }));
    const snap = metrics.getSnapshot('ws-1', 'AMAZON_SP');
    expect(snap.failureRate).toBe(0.5);
    expect(snap.successRate).toBe(0.5);
  });

  it('computes p95 response time', () => {
    for (let i = 1; i <= 20; i++) {
      metrics.record(makeResult({ responseTimeMs: i * 10 }));
    }
    const snap = metrics.getSnapshot('ws-1', 'AMAZON_SP');
    expect(snap.p95ResponseTimeMs).toBeGreaterThan(0);
  });

  it('returns 100% uptime with no checks', () => {
    const snap = metrics.getSnapshot('ws-1', 'AMAZON_SP');
    expect(snap.uptimePercent).toBe(100);
  });

  it('resets metrics for a workspace', () => {
    metrics.record(makeResult());
    metrics.reset('ws-1');
    const snap = metrics.getSnapshot('ws-1', 'AMAZON_SP');
    expect(snap.totalChecks).toBe(0);
  });

  it('handles DEGRADED state as success', () => {
    metrics.record(makeResult({ healthState: MarketplaceHealthState.DEGRADED }));
    const snap = metrics.getSnapshot('ws-1', 'AMAZON_SP');
    expect(snap.successRate).toBe(1);
  });
});

// ── StatusManager Tests ───────────────────────────────────────

describe('MarketplaceHealthStatusManager', () => {
  let statusManager: MarketplaceHealthStatusManager;
  let fakeRepo: {
    findRecord: jest.Mock;
    upsertRecord: jest.Mock;
    createHistory: jest.Mock;
    createAuditLog: jest.Mock;
  };
  let fakeEventQueue: { enqueue: jest.Mock; events: HealthCheckResult[] };

  beforeEach(() => {
    fakeRepo = {
      findRecord: jest.fn().mockResolvedValue(null),
      upsertRecord: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'rec-1', ...data })),
      createHistory: jest.fn().mockResolvedValue({}),
      createAuditLog: jest.fn().mockResolvedValue({}),
    };
    fakeEventQueue = { enqueue: jest.fn().mockResolvedValue(undefined), events: [] };
    fakeEventQueue.enqueue.mockImplementation((p) => { fakeEventQueue.events.push(p); return Promise.resolve(); });

    statusManager = new MarketplaceHealthStatusManager(fakeRepo as any, fakeEventQueue as any);
  });

  it('stores result and returns health record', async () => {
    const result = await statusManager.apply(makeResult());
    expect(result.healthState).toBe(MarketplaceHealthState.HEALTHY);
    expect(fakeRepo.upsertRecord).toHaveBeenCalled();
  });

  it('writes to history on every check', async () => {
    await statusManager.apply(makeResult());
    expect(fakeRepo.createHistory).toHaveBeenCalled();
  });

  it('emits UP event on first healthy check (no previous state)', async () => {
    await statusManager.apply(makeResult());
    expect(fakeEventQueue.events.some((e) => (e as any).event === MarketplaceHealthEvent.UP)).toBe(true);
  });

  it('emits DOWN event when transitioning HEALTHY → UNHEALTHY', async () => {
    // First check: HEALTHY
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.HEALTHY, consecutiveFailures: 0, consecutiveSuccess: 1,
    });
    await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.UNHEALTHY }));
    expect(fakeEventQueue.events.some((e) => (e as any).event === MarketplaceHealthEvent.DOWN)).toBe(true);
  });

  it('emits RESTORED event when transitioning UNHEALTHY → HEALTHY', async () => {
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.UNHEALTHY, consecutiveFailures: 3, consecutiveSuccess: 0,
    });
    await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.HEALTHY }));
    expect(fakeEventQueue.events.some((e) => (e as any).event === MarketplaceHealthEvent.RESTORED)).toBe(true);
  });

  it('emits DEGRADED event when transitioning HEALTHY → DEGRADED', async () => {
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.HEALTHY, consecutiveFailures: 0, consecutiveSuccess: 1,
    });
    await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.DEGRADED }));
    expect(fakeEventQueue.events.some((e) => (e as any).event === MarketplaceHealthEvent.DEGRADED)).toBe(true);
  });

  it('does NOT emit event when state unchanged', async () => {
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.HEALTHY, consecutiveFailures: 0, consecutiveSuccess: 1,
    });
    await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.HEALTHY }));
    expect(fakeEventQueue.events).toHaveLength(0);
  });

  it('increments consecutive failures on unhealthy result', async () => {
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.UNHEALTHY, consecutiveFailures: 2, consecutiveSuccess: 0,
    });
    const record = await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.UNHEALTHY }));
    expect(record.consecutiveFailures).toBe(3);
  });

  it('resets consecutive failures on healthy result', async () => {
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.UNHEALTHY, consecutiveFailures: 4, consecutiveSuccess: 0,
    });
    const record = await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.HEALTHY }));
    expect(record.consecutiveFailures).toBe(0);
  });

  it('sanitizes error messages — no secrets leaked', async () => {
    const result = makeResult({
      healthState: MarketplaceHealthState.UNHEALTHY,
      lastError: 'Auth failed: token=abc123-secret-key',
    });
    const record = await statusManager.apply(result);
    expect(record.lastError).not.toContain('abc123');
    expect(record.lastError).toContain('***');
  });

  it('writes audit log when state changes', async () => {
    fakeRepo.findRecord.mockResolvedValueOnce({
      id: 'r1', healthState: MarketplaceHealthState.HEALTHY, consecutiveFailures: 0, consecutiveSuccess: 1,
    });
    await statusManager.apply(makeResult({ healthState: MarketplaceHealthState.DEGRADED }));
    expect(fakeRepo.createAuditLog).toHaveBeenCalled();
  });

  it('getCurrent returns cached record', async () => {
    await statusManager.apply(makeResult());
    const cached = statusManager.getCurrent('ws-1', 'AMAZON_SP');
    expect(cached).not.toBeNull();
  });

  it('invalidate removes from cache', async () => {
    await statusManager.apply(makeResult());
    statusManager.invalidate('ws-1', 'AMAZON_SP');
    expect(statusManager.getCurrent('ws-1', 'AMAZON_SP')).toBeNull();
  });

  it('workspace isolation: different workspaces have independent records', async () => {
    await statusManager.apply(makeResult({ workspaceId: 'ws-A' }));
    await statusManager.apply(makeResult({ workspaceId: 'ws-B', healthState: MarketplaceHealthState.UNHEALTHY }));
    expect(statusManager.getCurrentState('ws-A', 'AMAZON_SP')).toBe(MarketplaceHealthState.HEALTHY);
    expect(statusManager.getCurrentState('ws-B', 'AMAZON_SP')).toBe(MarketplaceHealthState.UNHEALTHY);
  });
});

// ── MonitorService Tests ──────────────────────────────────────

describe('MarketplaceHealthMonitorService', () => {
  let monitor: MarketplaceHealthMonitorService;
  let fakeRegistry: {
    isRegistered: jest.Mock;
    get: jest.Mock;
    getActive: jest.Mock;
  };
  let fakeStatusManager: { apply: jest.Mock };
  let fakeMetrics: { record: jest.Mock };
  let fakeRepo: { findRecord: jest.Mock; createHistory: jest.Mock };

  const makeAdapter = (status: string, latencyMs = 100) => ({
    metadata: { providerKey: 'AMAZON_SP' },
    healthCheck: jest.fn().mockResolvedValue({ status, latencyMs, message: '' }),
  });

  beforeEach(() => {
    fakeRegistry = {
      isRegistered: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue(makeAdapter('HEALTHY')),
      getActive: jest.fn().mockReturnValue([makeAdapter('HEALTHY')]),
    };
    fakeStatusManager = { apply: jest.fn().mockImplementation((r) => Promise.resolve({ ...r, id: 'rec-1' })) };
    fakeMetrics = { record: jest.fn() };
    fakeRepo = { findRecord: jest.fn().mockResolvedValue(null), createHistory: jest.fn() };

    monitor = new MarketplaceHealthMonitorService(
      fakeRegistry as any,
      fakeStatusManager as any,
      fakeMetrics as any,
      fakeRepo as any,
    );
  });

  it('returns HEALTHY result for healthy adapter', async () => {
    const result = await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.healthState).toBe(MarketplaceHealthState.HEALTHY);
    expect(result.apiReachable).toBe(true);
  });

  it('returns OFFLINE when provider not registered', async () => {
    fakeRegistry.isRegistered.mockReturnValue(false);
    const result = await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'UNKNOWN' });
    expect(result.healthState).toBe(MarketplaceHealthState.OFFLINE);
  });

  it('returns DEGRADED for slow response (>3s)', async () => {
    fakeRegistry.get.mockReturnValue(makeAdapter('HEALTHY', 4000));
    const result = await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.healthState).toBe(MarketplaceHealthState.DEGRADED);
  });

  it('returns OFFLINE when adapter throws after retries', async () => {
    const adapter = { metadata: { providerKey: 'AMAZON_SP' }, healthCheck: jest.fn().mockRejectedValue(new Error('Network error')) };
    fakeRegistry.get.mockReturnValue(adapter);
    const result = await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', timeout: 100 });
    expect(result.healthState).toBe(MarketplaceHealthState.OFFLINE);
  });

  it('calls statusManager.apply with result', async () => {
    await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeStatusManager.apply).toHaveBeenCalled();
  });

  it('calls metrics.record with result', async () => {
    await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeMetrics.record).toHaveBeenCalled();
  });

  it('checkAll returns results for all active providers', async () => {
    fakeRegistry.getActive.mockReturnValue([
      { metadata: { providerKey: 'AMAZON_SP' }, healthCheck: jest.fn().mockResolvedValue({ status: 'HEALTHY', latencyMs: 100 }) },
      { metadata: { providerKey: 'FLIPKART' }, healthCheck: jest.fn().mockResolvedValue({ status: 'HEALTHY', latencyMs: 150 }) },
    ]);
    fakeRegistry.isRegistered.mockReturnValue(true);
    fakeRegistry.get.mockImplementation((key: string) => ({
      metadata: { providerKey: key },
      healthCheck: jest.fn().mockResolvedValue({ status: 'HEALTHY', latencyMs: 100 }),
    }));
    const results = await monitor.checkAll('ws-1');
    expect(results.length).toBe(2);
  });

  it('does not expose credentials in error output', async () => {
    const adapter = {
      metadata: { providerKey: 'AMAZON_SP' },
      healthCheck: jest.fn().mockRejectedValue(new Error('Auth failed: secret=my-super-secret-key')),
    };
    fakeRegistry.get.mockReturnValue(adapter);
    const result = await monitor.checkProvider({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', timeout: 100 });
    expect(result.lastError).not.toContain('my-super-secret-key');
  });
});

// ── Scheduler Tests ───────────────────────────────────────────

describe('MarketplaceHealthCheckScheduler', () => {
  let scheduler: MarketplaceHealthCheckScheduler;
  let fakeMonitor: { checkAll: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    fakeMonitor = { checkAll: jest.fn().mockResolvedValue([]) };
    scheduler = new MarketplaceHealthCheckScheduler(fakeMonitor as any);
    scheduler.onModuleInit();
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
  });

  it('adds workspace and starts interval', () => {
    scheduler.addWorkspace('ws-1', 10_000);
    expect(scheduler.activeWorkspaces).toContain('ws-1');
  });

  it('does not add workspace twice', () => {
    scheduler.addWorkspace('ws-1');
    scheduler.addWorkspace('ws-1');
    expect(scheduler.activeWorkspaces.filter((w) => w === 'ws-1')).toHaveLength(1);
  });

  it('removes workspace and stops interval', () => {
    scheduler.addWorkspace('ws-1', 10_000);
    scheduler.removeWorkspace('ws-1');
    expect(scheduler.activeWorkspaces).not.toContain('ws-1');
  });

  it('triggers checkAll on interval tick', async () => {
    scheduler.addWorkspace('ws-1', 1_000);
    jest.advanceTimersByTime(1_001);
    await Promise.resolve(); // flush microtasks
    expect(fakeMonitor.checkAll).toHaveBeenCalledWith('ws-1', HealthCheckTrigger.SCHEDULED);
  });

  it('triggerAll calls checkAll for all workspaces', async () => {
    scheduler.addWorkspace('ws-A');
    scheduler.addWorkspace('ws-B');
    await scheduler.triggerAll();
    expect(fakeMonitor.checkAll).toHaveBeenCalledTimes(2);
  });
});
