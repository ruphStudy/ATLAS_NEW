import { Logger } from '@nestjs/common';
import { withRetry, withTimeout, AdapterTimeoutError, AdapterRetryExhaustedError } from '../adapters/adapter-retry.utils';
import { ProviderErrorCode } from '../interfaces';

const logger = new Logger('test');

describe('withTimeout', () => {
  it('resolves if operation completes before timeout', async () => {
    const result = await withTimeout(async () => 'ok', 1_000, 'TEST');
    expect(result).toBe('ok');
  });

  it('rejects with AdapterTimeoutError if operation exceeds timeout', async () => {
    await expect(
      withTimeout(
        () => new Promise((r) => setTimeout(r, 500)),
        10,
        'SLOW_PROVIDER',
      ),
    ).rejects.toThrow(AdapterTimeoutError);
  });
});

describe('withRetry', () => {
  it('resolves on first attempt when successful', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => { calls++; return 'success'; },
      { maxAttempts: 3, backoffMs: 0, backoffMultiplier: 1, retryableErrorCodes: new Set() },
      'TEST',
      logger,
    );
    expect(result).toBe('success');
    expect(calls).toBe(1);
  });

  it('retries on retryable errors and eventually succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('econnrefused');
        return 'done';
      },
      {
        maxAttempts: 5,
        backoffMs: 0,
        backoffMultiplier: 1,
        retryableErrorCodes: new Set([ProviderErrorCode.NETWORK_ERROR]),
      },
      'TEST',
      logger,
    );
    expect(result).toBe('done');
    expect(calls).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error('Invalid credentials');
        },
        {
          maxAttempts: 3,
          backoffMs: 0,
          backoffMultiplier: 1,
          retryableErrorCodes: new Set(),
          isRetryable: () => false,
        },
        'TEST',
        logger,
      ),
    ).rejects.toThrow('Invalid credentials');
    expect(calls).toBe(1);
  });

  it('exhausts all attempts and throws the last error', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error('etimedout');
        },
        {
          maxAttempts: 3,
          backoffMs: 0,
          backoffMultiplier: 1,
          retryableErrorCodes: new Set([ProviderErrorCode.TIMEOUT]),
        },
        'TEST',
        logger,
      ),
    ).rejects.toThrow('etimedout');
    expect(calls).toBe(3);
  });
});
