import { MarketplaceMetricsRecorder } from '../metrics/marketplace-metrics.recorder';
import { MarketplaceHealthStatus } from '../interfaces';

describe('MarketplaceMetricsRecorder', () => {
  let recorder: MarketplaceMetricsRecorder;

  beforeEach(() => {
    recorder = new MarketplaceMetricsRecorder();
  });

  it('initializes metrics on first record', () => {
    recorder.record({ providerKey: 'AMAZON_SP', success: true, latencyMs: 100 });
    const m = recorder.get('AMAZON_SP');
    expect(m).not.toBeNull();
    expect(m!.totalRequests).toBe(1);
    expect(m!.successCount).toBe(1);
    expect(m!.failureCount).toBe(0);
  });

  it('tracks success and failure counts', () => {
    recorder.record({ providerKey: 'P', success: true, latencyMs: 50 });
    recorder.record({ providerKey: 'P', success: false, latencyMs: 2000 });
    recorder.record({ providerKey: 'P', success: true, latencyMs: 80 });

    const m = recorder.get('P')!;
    expect(m.totalRequests).toBe(3);
    expect(m.successCount).toBe(2);
    expect(m.failureCount).toBe(1);
  });

  it('tracks retry count', () => {
    recorder.record({ providerKey: 'P', success: true, latencyMs: 100, retried: true });
    recorder.record({ providerKey: 'P', success: true, latencyMs: 100, retried: true });
    expect(recorder.get('P')!.retryCount).toBe(2);
  });

  it('tracks rate limit events', () => {
    recorder.record({ providerKey: 'P', success: false, latencyMs: 0, rateLimitHit: true });
    expect(recorder.get('P')!.rateLimitEventCount).toBe(1);
  });

  it('calculates rolling average latency', () => {
    recorder.record({ providerKey: 'P', success: true, latencyMs: 100 });
    recorder.record({ providerKey: 'P', success: true, latencyMs: 200 });
    recorder.record({ providerKey: 'P', success: true, latencyMs: 300 });
    expect(recorder.get('P')!.averageLatencyMs).toBeCloseTo(200, 0);
  });

  it('tracks health status', () => {
    recorder.record({
      providerKey: 'P', success: true, latencyMs: 50,
      healthStatus: MarketplaceHealthStatus.HEALTHY,
    });
    expect(recorder.get('P')!.healthStatus).toBe(MarketplaceHealthStatus.HEALTHY);
  });

  it('scopes metrics by accountId', () => {
    recorder.record({ providerKey: 'P', accountId: 'acct1', success: true, latencyMs: 50 });
    recorder.record({ providerKey: 'P', accountId: 'acct2', success: false, latencyMs: 100 });
    expect(recorder.get('P', 'acct1')!.successCount).toBe(1);
    expect(recorder.get('P', 'acct2')!.failureCount).toBe(1);
  });

  it('returns null for unrecorded provider', () => {
    expect(recorder.get('UNKNOWN')).toBeNull();
  });

  it('reset() clears metrics', () => {
    recorder.record({ providerKey: 'P', success: true, latencyMs: 50 });
    recorder.reset('P');
    expect(recorder.get('P')).toBeNull();
  });

  it('getAll() returns all provider metrics', () => {
    recorder.record({ providerKey: 'A', success: true, latencyMs: 50 });
    recorder.record({ providerKey: 'B', success: true, latencyMs: 60 });
    expect(recorder.getAll()).toHaveLength(2);
  });
});
