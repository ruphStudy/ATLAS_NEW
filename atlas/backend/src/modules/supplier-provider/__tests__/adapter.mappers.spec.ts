import {
  normalizeCurrency,
  normalizeCountry,
  normalizeUnit,
  normalizeDate,
  normalizeAddress,
  normalizeShipmentStatus,
  normalizeVerificationStatus,
  mapHttpStatusToErrorCode,
  sanitizeForLog,
  sanitizeHeaders,
  isRetryableErrorCode,
} from '../adapters/adapter.mappers';
import { NormalizedShipmentStatus, NormalizedVerificationStatus } from '../adapters/adapter.types';
import { ProviderErrorCode } from '../interfaces';

describe('adapter.mappers – currency', () => {
  it.each([
    ['INR', 'INR'],
    ['Rs', 'INR'],
    ['USD', 'USD'],
    ['CNY', 'CNY'],
    ['RMB', 'CNY'],
    ['EUR', 'EUR'],
    ['xyz', null],
    [null, null],
    [undefined, null],
  ])('normalizeCurrency(%s) → %s', (input, expected) => {
    expect(normalizeCurrency(input as string)).toBe(expected);
  });
});

describe('adapter.mappers – country', () => {
  it.each([
    ['IN', 'IN'],
    ['india', 'IN'],
    ['INDIA', 'IN'],
    ['China', 'CN'],
    ['UK', 'GB'],
    ['usa', 'US'],
    ['DE', 'DE'],
    [null, null],
    [undefined, null],
  ])('normalizeCountry(%s) → %s', (input, expected) => {
    expect(normalizeCountry(input as string)).toBe(expected);
  });
});

describe('adapter.mappers – unit', () => {
  it.each([
    ['Piece', 'PCS'],
    ['PIECES', 'PCS'],
    ['KG', 'KG'],
    ['kilogram', 'KG'],
    ['Litre', 'L'],
    ['ROLL', 'ROLL'],
    [null, null],
    [undefined, null],
  ])('normalizeUnit(%s) → %s', (input, expected) => {
    expect(normalizeUnit(input as string)).toBe(expected);
  });
});

describe('adapter.mappers – date', () => {
  it('returns null for null input', () => {
    expect(normalizeDate(null)).toBeNull();
  });

  it('returns a Date for ISO string', () => {
    const d = normalizeDate('2024-01-15T12:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2024);
  });

  it('returns null for invalid date string', () => {
    expect(normalizeDate('not-a-date')).toBeNull();
  });

  it('returns same Date if input is already a Date', () => {
    const date = new Date('2024-03-20');
    expect(normalizeDate(date)).toBe(date);
  });
});

describe('adapter.mappers – address', () => {
  it('returns null for null input', () => {
    expect(normalizeAddress(null)).toBeNull();
  });

  it('maps standard fields', () => {
    const result = normalizeAddress({
      street: '123 Main St',
      city: 'Mumbai',
      country: 'India',
      zip: '400001',
    });
    expect(result?.line1).toBe('123 Main St');
    expect(result?.city).toBe('Mumbai');
    expect(result?.country).toBe('IN');
    expect(result?.postalCode).toBe('400001');
  });
});

describe('adapter.mappers – shipment status', () => {
  it.each([
    ['in_transit', NormalizedShipmentStatus.IN_TRANSIT],
    ['DELIVERED', NormalizedShipmentStatus.DELIVERED],
    ['out_for_delivery', NormalizedShipmentStatus.OUT_FOR_DELIVERY],
    ['EXCEPTION', NormalizedShipmentStatus.EXCEPTION],
    ['returned', NormalizedShipmentStatus.RETURNED],
    ['pending', NormalizedShipmentStatus.PENDING],
    ['garbage', NormalizedShipmentStatus.UNKNOWN],
    [null, NormalizedShipmentStatus.UNKNOWN],
  ])('normalizeShipmentStatus(%s) → %s', (input, expected) => {
    expect(normalizeShipmentStatus(input as string)).toBe(expected);
  });
});

describe('adapter.mappers – verification status', () => {
  it.each([
    ['VERIFIED', NormalizedVerificationStatus.VERIFIED],
    ['gold', NormalizedVerificationStatus.VERIFIED],
    ['PENDING', NormalizedVerificationStatus.PENDING],
    ['REJECTED', NormalizedVerificationStatus.REJECTED],
    ['expired', NormalizedVerificationStatus.EXPIRED],
    ['random', NormalizedVerificationStatus.UNVERIFIED],
    [null, NormalizedVerificationStatus.UNVERIFIED],
  ])('normalizeVerificationStatus(%s) → %s', (input, expected) => {
    expect(normalizeVerificationStatus(input as string)).toBe(expected);
  });
});

describe('adapter.mappers – HTTP status to error code', () => {
  it.each([
    [400, ProviderErrorCode.INVALID_REQUEST],
    [401, ProviderErrorCode.AUTH_FAILED],
    [403, ProviderErrorCode.AUTH_FAILED],
    [404, ProviderErrorCode.NOT_FOUND],
    [429, ProviderErrorCode.RATE_LIMITED],
    [500, ProviderErrorCode.PROVIDER_UNAVAILABLE],
    [503, ProviderErrorCode.PROVIDER_UNAVAILABLE],
    [504, ProviderErrorCode.TIMEOUT],
    [200, ProviderErrorCode.UNKNOWN],
  ])('mapHttpStatusToErrorCode(%d) → %s', (status, expected) => {
    expect(mapHttpStatusToErrorCode(status)).toBe(expected);
  });
});

describe('adapter.mappers – isRetryableErrorCode', () => {
  it.each([
    [ProviderErrorCode.TIMEOUT, true],
    [ProviderErrorCode.NETWORK_ERROR, true],
    [ProviderErrorCode.RATE_LIMITED, true],
    [ProviderErrorCode.PROVIDER_UNAVAILABLE, true],
    [ProviderErrorCode.AUTH_FAILED, false],
    [ProviderErrorCode.NOT_FOUND, false],
    [ProviderErrorCode.INVALID_REQUEST, false],
  ])('isRetryableErrorCode(%s) → %s', (code, expected) => {
    expect(isRetryableErrorCode(code)).toBe(expected);
  });
});

describe('adapter.mappers – sanitizeForLog', () => {
  it('redacts sensitive keys', () => {
    const sanitized = sanitizeForLog({
      apikey: 'secret123',
      token: 'Bearer xyz',
      url: 'https://example.com',
      name: 'test',
    });
    expect(sanitized['apikey']).toBe('[REDACTED]');
    expect(sanitized['token']).toBe('[REDACTED]');
    expect(sanitized['url']).toBe('https://example.com');
    expect(sanitized['name']).toBe('test');
  });

  it('redacts nested sensitive keys', () => {
    const sanitized = sanitizeForLog({
      credentials: { password: 'secret', username: 'user' },
    });
    expect((sanitized['credentials'] as Record<string, unknown>)['password']).toBe('[REDACTED]');
    expect((sanitized['credentials'] as Record<string, unknown>)['username']).toBe('user');
  });
});

describe('adapter.mappers – sanitizeHeaders', () => {
  it('redacts authorization header', () => {
    const result = sanitizeHeaders({
      authorization: 'Bearer token123',
      'content-type': 'application/json',
    });
    expect(result['authorization']).toBe('[REDACTED]');
    expect(result['content-type']).toBe('application/json');
  });
});
