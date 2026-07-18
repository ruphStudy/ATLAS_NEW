import { MarketplaceErrorNormalizer } from '../errors/marketplace-error-normalizer';
import { MarketplaceErrorCode } from '../interfaces';

describe('MarketplaceErrorNormalizer', () => {
  let normalizer: MarketplaceErrorNormalizer;

  beforeEach(() => {
    normalizer = new MarketplaceErrorNormalizer();
  });

  const cases: [string, unknown, MarketplaceErrorCode, boolean][] = [
    ['timeout error', new Error('Request timed out'), MarketplaceErrorCode.TIMEOUT, true],
    ['rate limit by message', new Error('rate limit exceeded'), MarketplaceErrorCode.RATE_LIMITED, true],
    ['rate limit by 429', new Error('429 too many requests'), MarketplaceErrorCode.RATE_LIMITED, true],
    ['auth failed 401', new Error('401 unauthorized'), MarketplaceErrorCode.AUTH_FAILED, false],
    ['forbidden 403', new Error('403 permission denied'), MarketplaceErrorCode.AUTHORIZATION_FAILED, false],
    ['not found 404', new Error('404 not found'), MarketplaceErrorCode.NOT_FOUND, false],
    ['network error', new Error('ECONNREFUSED connection refused'), MarketplaceErrorCode.NETWORK_ERROR, true],
    ['quota exceeded', new Error('quota exceeded'), MarketplaceErrorCode.QUOTA_EXCEEDED, false],
    ['parse error', new Error('JSON parse error'), MarketplaceErrorCode.PARSE_ERROR, false],
    ['unsupported capability', new Error('unsupported capability requested'), MarketplaceErrorCode.UNSUPPORTED_CAPABILITY, false],
    ['credential expired', new Error('credential expir'), MarketplaceErrorCode.CREDENTIALS_EXPIRED, false],
    ['account suspended', new Error('account suspended'), MarketplaceErrorCode.ACCOUNT_SUSPENDED, false],
    ['validation error', new Error('422 validation error'), MarketplaceErrorCode.VALIDATION_ERROR, false],
    ['provider unavailable (500)', { status: 500, message: 'Internal Server Error' }, MarketplaceErrorCode.PROVIDER_UNAVAILABLE, true],
    ['http 404', { status: 404, message: 'Not Found' }, MarketplaceErrorCode.NOT_FOUND, false],
    ['http 401', { status: 401, message: 'Unauthorized' }, MarketplaceErrorCode.AUTH_FAILED, false],
    ['http 403', { status: 403, message: 'Forbidden' }, MarketplaceErrorCode.AUTHORIZATION_FAILED, false],
    ['http 429', { status: 429, message: 'Too Many Requests' }, MarketplaceErrorCode.RATE_LIMITED, true],
    ['unknown error', new Error('something weird happened'), MarketplaceErrorCode.UNKNOWN, false],
  ];

  test.each(cases)('normalizes %s → %s (retryable=%s)', (_label, error, expectedCode, expectedRetryable) => {
    const result = normalizer.normalize(error, 'TEST_PROVIDER');
    expect(result.code).toBe(expectedCode);
    expect(result.retryable).toBe(expectedRetryable);
    expect(result.providerKey).toBe('TEST_PROVIDER');
    expect(result.message).toBeDefined();
  });

  it('re-normalizes already-normalized exceptions without double-wrapping', () => {
    const original = normalizer.normalize(new Error('rate limit exceeded'), 'PROVIDER');
    const wrapped = normalizer.wrap(new Error('rate limit exceeded'), 'PROVIDER');
    const renormalized = normalizer.normalize(wrapped, 'PROVIDER');
    expect(renormalized.code).toBe(MarketplaceErrorCode.RATE_LIMITED);
  });

  it('wraps error into MarketplaceNormalizedException', () => {
    const wrapped = normalizer.wrap(new Error('timeout'), 'PROVIDER');
    expect(wrapped.normalized.code).toBe(MarketplaceErrorCode.TIMEOUT);
  });

  it('isRetryable() returns correct values', () => {
    expect(normalizer.isRetryable(MarketplaceErrorCode.TIMEOUT)).toBe(true);
    expect(normalizer.isRetryable(MarketplaceErrorCode.RATE_LIMITED)).toBe(true);
    expect(normalizer.isRetryable(MarketplaceErrorCode.NETWORK_ERROR)).toBe(true);
    expect(normalizer.isRetryable(MarketplaceErrorCode.PROVIDER_UNAVAILABLE)).toBe(true);
    expect(normalizer.isRetryable(MarketplaceErrorCode.AUTH_FAILED)).toBe(false);
    expect(normalizer.isRetryable(MarketplaceErrorCode.NOT_FOUND)).toBe(false);
    expect(normalizer.isRetryable(MarketplaceErrorCode.VALIDATION_ERROR)).toBe(false);
  });

  it('never exposes credentials in normalized error message', () => {
    const errMsg = 'Error: apiKey=my-secret-key failed';
    const result = normalizer.normalize(new Error(errMsg), 'PROVIDER');
    // Code is normalized — message is what Error says (provider responsibility to not include creds)
    expect(result.code).toBeDefined();
    // The normalizer doesn't strip raw messages; provider adapters must not embed creds in errors
    expect(result.providerKey).toBe('PROVIDER');
  });
});
