import {
  ConnectionAuthStatus,
  ConnectionCapabilityStatus,
  ConnectionErrorCategory,
  ConnectionStatus,
  ConnectionTestEvent,
  ConnectionTestTrigger,
} from '../interfaces';
import { ConnectionTestValidator } from '../validator/connection-test.validator';
import { ConnectionTestRunner } from '../runner/connection-test.runner';
import { ConnectionTestResultManager } from '../result/connection-test-result.manager';
import { MP_CONN_TEST_ERROR_CODES } from '../constants';

// ── Helpers ───────────────────────────────────────────────────

function makeExecute(status: 'HEALTHY' | 'UNHEALTHY' = 'HEALTHY', latencyMs = 100, message = '') {
  return jest.fn().mockResolvedValue({ providerKey: 'AMAZON_SP', status, latencyMs, message, checkedAt: new Date() });
}

// ── Validator Tests ───────────────────────────────────────────

describe('ConnectionTestValidator', () => {
  let validator: ConnectionTestValidator;

  beforeEach(() => {
    validator = new ConnectionTestValidator();
  });

  it('passes with valid request', () => {
    const r = validator.validate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(r.valid).toBe(true);
  });

  it('fails when workspaceId is missing', () => {
    const r = validator.validate({ workspaceId: '', providerKey: 'AMAZON_SP' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/workspaceId/);
  });

  it('fails when providerKey is missing', () => {
    const r = validator.validate({ workspaceId: 'ws-1', providerKey: '' });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/providerKey/);
  });

  it('fails when timeoutMs is below minimum', () => {
    const r = validator.validate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', timeoutMs: 500 });
    expect(r.valid).toBe(false);
  });

  it('fails when timeoutMs exceeds maximum', () => {
    const r = validator.validate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', timeoutMs: 120_000 });
    expect(r.valid).toBe(false);
  });

  it('passes with explicit valid timeoutMs', () => {
    const r = validator.validate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', timeoutMs: 10_000 });
    expect(r.valid).toBe(true);
  });
});

// ── Runner Tests ──────────────────────────────────────────────

describe('ConnectionTestRunner', () => {
  let runner: ConnectionTestRunner;

  beforeEach(() => {
    runner = new ConnectionTestRunner();
  });

  const baseOpts = {
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    accountId: null as string | null,
    correlationId: 'corr-1',
    trigger: ConnectionTestTrigger.MANUAL,
  };

  it('returns success=true for HEALTHY adapter', async () => {
    const result = await runner.run({ ...baseOpts, execute: makeExecute('HEALTHY') });
    expect(result.success).toBe(true);
    expect(result.connectionStatus).toBe(ConnectionStatus.CONNECTED);
    expect(result.authStatus).toBe(ConnectionAuthStatus.AUTHENTICATED);
  });

  it('returns success=false for UNHEALTHY adapter', async () => {
    const result = await runner.run({ ...baseOpts, execute: makeExecute('UNHEALTHY', 200, 'Service error') });
    expect(result.success).toBe(false);
  });

  it('classifies timeout errors correctly', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('timeout after 15000ms'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 100 });
    expect(result.errorCategory).toBe(ConnectionErrorCategory.TIMEOUT);
    expect(result.retryable).toBe(true);
  });

  it('classifies network errors as retryable', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('econnrefused'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 200 });
    expect(result.errorCategory).toBe(ConnectionErrorCategory.NETWORK);
    expect(result.retryable).toBe(true);
  });

  it('classifies auth errors as non-retryable', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('401 unauthorized'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 200 });
    expect(result.errorCategory).toBe(ConnectionErrorCategory.AUTHENTICATION);
    expect(result.retryable).toBe(false);
  });

  it('classifies rate-limit errors as retryable', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('429 too many requests'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 200 });
    expect(result.errorCategory).toBe(ConnectionErrorCategory.RATE_LIMIT);
    expect(result.retryable).toBe(true);
  });

  it('classifies unsupported capability as non-retryable', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('unsupported capability'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 200 });
    expect(result.errorCategory).toBe(ConnectionErrorCategory.UNSUPPORTED_CAPABILITY);
    expect(result.retryable).toBe(false);
  });

  it('never exposes secret in errorMessage', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('Auth failed: token=MYSECRET123'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 200 });
    expect(result.errorMessage).not.toContain('MYSECRET123');
    expect(result.errorMessage).toContain('***');
  });

  it('never exposes password in errorMessage', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('password=supersecure network error'));
    const result = await runner.run({ ...baseOpts, execute, timeoutMs: 200 });
    expect(result.errorMessage).not.toContain('supersecure');
  });

  it('sets capabilityStatus to NOT_CHECKED when no capabilityKey', async () => {
    const result = await runner.run({ ...baseOpts, execute: makeExecute() });
    expect(result.capabilityStatus).toBe(ConnectionCapabilityStatus.NOT_CHECKED);
  });

  it('sets capabilityStatus to SUPPORTED when capabilityKey provided and test succeeds', async () => {
    const result = await runner.run({ ...baseOpts, execute: makeExecute(), capabilityKey: 'PUBLISH_LISTING' });
    expect(result.capabilityStatus).toBe(ConnectionCapabilityStatus.SUPPORTED);
  });

  it('sets correlationId on result', async () => {
    const result = await runner.run({ ...baseOpts, correlationId: 'my-corr', execute: makeExecute() });
    expect(result.correlationId).toBe('my-corr');
  });

  it('includes responseTimeMs', async () => {
    const result = await runner.run({ ...baseOpts, execute: makeExecute() });
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// ── ResultManager Tests ───────────────────────────────────────

describe('ConnectionTestResultManager', () => {
  let manager: ConnectionTestResultManager;
  let fakeRepo: { create: jest.Mock; findById: jest.Mock; findByCorrelationId: jest.Mock };

  const baseResult = {
    correlationId: 'corr-1',
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    accountId: null as string | null,
    success: true,
    connectionStatus: ConnectionStatus.CONNECTED,
    authStatus: ConnectionAuthStatus.AUTHENTICATED,
    capabilityStatus: ConnectionCapabilityStatus.NOT_CHECKED,
    responseTimeMs: 200,
    errorCode: null as string | null,
    errorMessage: null as string | null,
    errorCategory: null as ConnectionErrorCategory | null,
    retryable: false,
    testedAt: new Date(),
    triggeredBy: ConnectionTestTrigger.MANUAL,
  };

  beforeEach(() => {
    fakeRepo = {
      create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'rec-1', ...data })),
      findById: jest.fn().mockResolvedValue(null),
      findByCorrelationId: jest.fn().mockResolvedValue(null),
    };
    manager = new ConnectionTestResultManager(fakeRepo as any);
  });

  it('isInProgress returns false initially', () => {
    expect(manager.isInProgress('ws-1', 'AMAZON_SP')).toBe(false);
  });

  it('lock marks as in-progress', () => {
    manager.lock('ws-1', 'AMAZON_SP', 'corr-1');
    expect(manager.isInProgress('ws-1', 'AMAZON_SP')).toBe(true);
  });

  it('unlock removes in-progress', () => {
    manager.lock('ws-1', 'AMAZON_SP', 'corr-1');
    manager.unlock('ws-1', 'AMAZON_SP');
    expect(manager.isInProgress('ws-1', 'AMAZON_SP')).toBe(false);
  });

  it('getInProgressCorrelationId returns correlationId', () => {
    manager.lock('ws-1', 'AMAZON_SP', 'corr-abc');
    expect(manager.getInProgressCorrelationId('ws-1', 'AMAZON_SP')).toBe('corr-abc');
  });

  it('workspace isolation for in-progress locks', () => {
    manager.lock('ws-A', 'AMAZON_SP', 'corr-A');
    expect(manager.isInProgress('ws-B', 'AMAZON_SP')).toBe(false);
  });

  it('save persists result to repository', async () => {
    await manager.save(baseResult);
    expect(fakeRepo.create).toHaveBeenCalled();
  });

  it('save strips sensitive fields (save does not store credentials)', async () => {
    await manager.save(baseResult);
    const savedData = (fakeRepo.create.mock.calls[0] as unknown as [Record<string, unknown>][])[0][0] as Record<string, unknown>;
    // No credential/token fields should appear in saved data
    expect(Object.keys(savedData)).not.toContain('credentials');
    expect(Object.keys(savedData)).not.toContain('token');
  });

  it('findById delegates to repository', async () => {
    fakeRepo.findById.mockResolvedValue({ id: 'rec-1', ...baseResult });
    const result = await manager.findById('rec-1', 'ws-1');
    expect(result?.correlationId).toBe('corr-1');
  });
});
