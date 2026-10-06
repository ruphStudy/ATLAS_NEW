import { AdapterIdempotencyService } from '../adapters/adapter-idempotency.service';

describe('AdapterIdempotencyService', () => {
  let service: AdapterIdempotencyService;

  beforeEach(() => {
    service = new AdapterIdempotencyService();
  });

  it('builds a deterministic key for the same params', () => {
    const params = { keyword: 'valve', quantity: 100 };
    const k1 = service.buildKey('ws1', 'INDIAMART', 'REQUEST_QUOTATION', params);
    const k2 = service.buildKey('ws1', 'INDIAMART', 'REQUEST_QUOTATION', params);
    expect(k1).toBe(k2);
  });

  it('builds different keys for different workspaces', () => {
    const params = { keyword: 'valve' };
    const k1 = service.buildKey('ws1', 'INDIAMART', 'op', params);
    const k2 = service.buildKey('ws2', 'INDIAMART', 'op', params);
    expect(k1).not.toBe(k2);
  });

  it('marks a key as PENDING then COMPLETED', () => {
    const key = 'idm:abc123';
    service.markPending(key, 'ws1', 'INDIAMART', 'op', 'hash1');
    expect(service.isPending(key)).toBe(true);
    expect(service.findCompleted(key)).toBeNull();

    service.markCompleted(key, 'responseHash');
    expect(service.isPending(key)).toBe(false);
    expect(service.findCompleted(key)).not.toBeNull();
  });

  it('findCompleted returns null for FAILED key', () => {
    const key = 'idm:failed';
    service.markPending(key, 'ws1', 'INDIAMART', 'op', 'hash');
    service.markFailed(key);
    expect(service.findCompleted(key)).toBeNull();
  });

  it('does not return expired records', () => {
    const key = 'idm:expired';
    service.markPending(key, 'ws1', 'INDIAMART', 'op', 'hash');
    service.markCompleted(key);

    // Manually set expiry to the past
    const record = (service as unknown as { store: Map<string, unknown> }).store.get(key) as { expiresAt: Date };
    record.expiresAt = new Date(Date.now() - 1_000);

    expect(service.findCompleted(key)).toBeNull();
  });

  it('evicts expired records', () => {
    const key = 'idm:toEvict';
    service.markPending(key, 'ws1', 'INDIAMART', 'op', 'hash');

    const record = (service as unknown as { store: Map<string, unknown> }).store.get(key) as { expiresAt: Date };
    record.expiresAt = new Date(Date.now() - 1_000);

    const evicted = service.evictExpired();
    expect(evicted).toBe(1);
    expect(service.isPending(key)).toBe(false);
  });
});
