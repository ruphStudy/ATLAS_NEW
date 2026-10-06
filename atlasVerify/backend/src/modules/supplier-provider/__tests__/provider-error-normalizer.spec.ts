import { ProviderErrorNormalizer, ProviderNormalizedException } from '../errors/provider-error-normalizer';
import { ProviderErrorCode, SupplierProviderCode } from '../interfaces';

describe('ProviderErrorNormalizer', () => {
  let normalizer: ProviderErrorNormalizer;
  const code = SupplierProviderCode.INDIAMART;

  beforeEach(() => {
    normalizer = new ProviderErrorNormalizer();
  });

  it('normalizes timeout error', () => {
    const result = normalizer.normalize(new Error('request etimedout'), code);
    expect(result.code).toBe(ProviderErrorCode.TIMEOUT);
    expect(result.retryable).toBe(true);
  });

  it('normalizes rate-limit error', () => {
    const result = normalizer.normalize(new Error('rate limit exceeded'), code);
    expect(result.code).toBe(ProviderErrorCode.RATE_LIMITED);
    expect(result.retryable).toBe(true);
  });

  it('normalizes auth error', () => {
    const result = normalizer.normalize(new Error('unauthorized: invalid api key'), code);
    expect(result.code).toBe(ProviderErrorCode.AUTH_FAILED);
    expect(result.retryable).toBe(false);
  });

  it('normalizes not found error', () => {
    const result = normalizer.normalize(new Error('supplier not found 404'), code);
    expect(result.code).toBe(ProviderErrorCode.NOT_FOUND);
    expect(result.retryable).toBe(false);
  });

  it('normalizes network error', () => {
    const result = normalizer.normalize(new Error('econnrefused'), code);
    expect(result.code).toBe(ProviderErrorCode.NETWORK_ERROR);
    expect(result.retryable).toBe(true);
  });

  it('normalizes parse error', () => {
    const result = normalizer.normalize(new Error('invalid response json'), code);
    expect(result.code).toBe(ProviderErrorCode.PARSE_ERROR);
    expect(result.retryable).toBe(false);
  });

  it('normalizes HTTP 401 status object', () => {
    const result = normalizer.normalize({ status: 401, message: 'Unauthorized' }, code);
    expect(result.code).toBe(ProviderErrorCode.AUTH_FAILED);
  });

  it('normalizes HTTP 429 status object', () => {
    const result = normalizer.normalize({ status: 429, message: 'Too many requests' }, code);
    expect(result.code).toBe(ProviderErrorCode.RATE_LIMITED);
    expect(result.retryable).toBe(true);
  });

  it('returns normalized error for unknown error', () => {
    const result = normalizer.normalize('something weird', code);
    expect(result.code).toBe(ProviderErrorCode.UNKNOWN);
    expect(result.providerCode).toBe(code);
  });

  it('short-circuits on ProviderNormalizedException', () => {
    const original = normalizer.normalize(new Error('timeout'), code);
    const wrapped = new ProviderNormalizedException(original);
    const result = normalizer.normalize(wrapped, code);
    expect(result).toBe(original);
  });

  it('toUnhealthyResult produces UNHEALTHY status', () => {
    const start = Date.now() - 500;
    const result = normalizer.toUnhealthyResult(code, new Error('down'), start);
    expect(result.status).toBe('UNHEALTHY');
    expect(result.latencyMs).toBeGreaterThanOrEqual(500);
    expect(result.providerCode).toBe(code);
  });

  it('isRetryable correctly identifies retryable codes', () => {
    expect(normalizer.isRetryable(ProviderErrorCode.TIMEOUT)).toBe(true);
    expect(normalizer.isRetryable(ProviderErrorCode.NETWORK_ERROR)).toBe(true);
    expect(normalizer.isRetryable(ProviderErrorCode.RATE_LIMITED)).toBe(true);
    expect(normalizer.isRetryable(ProviderErrorCode.PROVIDER_UNAVAILABLE)).toBe(true);
    expect(normalizer.isRetryable(ProviderErrorCode.AUTH_FAILED)).toBe(false);
    expect(normalizer.isRetryable(ProviderErrorCode.INVALID_REQUEST)).toBe(false);
    expect(normalizer.isRetryable(ProviderErrorCode.NOT_FOUND)).toBe(false);
  });
});
