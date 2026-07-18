import {
  AdapterAuditEvent,
  AdapterCapability,
  AdapterError,
  AdapterMetricEvent,
  AdapterRequestContext,
  AdapterResponseMetadata,
  ExternalReference,
  IntegrationStrategy,
  NormalizedShipmentStatus,
  NormalizedVerificationStatus,
} from './adapter.types';
import { ProviderErrorCode } from '../interfaces';

// ── Currency Normalization ────────────────────────────────────

const CURRENCY_ALIASES: Record<string, string> = {
  'INR': 'INR',
  'RS': 'INR',
  'RUPEE': 'INR',
  'USD': 'USD',
  'US$': 'USD',
  'CNY': 'CNY',
  'RMB': 'CNY',
  'EUR': 'EUR',
  'GBP': 'GBP',
  'AED': 'AED',
  'SGD': 'SGD',
  'JPY': 'JPY',
};

export function normalizeCurrency(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  return CURRENCY_ALIASES[upper] ?? (upper.length === 3 ? upper : null);
}

// ── Unit Normalization ────────────────────────────────────────

const UNIT_ALIASES: Record<string, string> = {
  'PIECE': 'PCS',
  'PIECES': 'PCS',
  'PC': 'PCS',
  'PCS': 'PCS',
  'UNIT': 'UNIT',
  'UNITS': 'UNIT',
  'SET': 'SET',
  'SETS': 'SET',
  'KG': 'KG',
  'KILOGRAM': 'KG',
  'KILOGRAMS': 'KG',
  'G': 'G',
  'GRAM': 'G',
  'GRAMS': 'G',
  'TON': 'TON',
  'TONNE': 'TON',
  'MT': 'TON',
  'LTR': 'L',
  'LITRE': 'L',
  'LITER': 'L',
  'L': 'L',
  'M': 'M',
  'METER': 'M',
  'METRE': 'M',
  'FT': 'FT',
  'FOOT': 'FT',
  'FEET': 'FT',
  'PAIR': 'PAIR',
  'PAIRS': 'PAIR',
  'BOX': 'BOX',
  'BOXES': 'BOX',
  'CARTON': 'CTN',
  'CTN': 'CTN',
  'BAG': 'BAG',
  'BAGS': 'BAG',
  'ROLL': 'ROLL',
  'ROLLS': 'ROLL',
};

export function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  return UNIT_ALIASES[upper] ?? upper;
}

// ── Country Normalization ─────────────────────────────────────

const COUNTRY_ALIASES: Record<string, string> = {
  'INDIA': 'IN',
  'CHINA': 'CN',
  'UNITED STATES': 'US',
  'USA': 'US',
  'UNITED KINGDOM': 'GB',
  'UK': 'GB',
  'GERMANY': 'DE',
  'JAPAN': 'JP',
  'SOUTH KOREA': 'KR',
  'KOREA': 'KR',
  'TAIWAN': 'TW',
  'HONG KONG': 'HK',
  'SINGAPORE': 'SG',
  'UAE': 'AE',
  'UNITED ARAB EMIRATES': 'AE',
  'BANGLADESH': 'BD',
  'VIETNAM': 'VN',
  'THAILAND': 'TH',
  'MALAYSIA': 'MY',
  'INDONESIA': 'ID',
};

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper.length === 2) return upper; // already ISO alpha-2
  return COUNTRY_ALIASES[upper] ?? upper.slice(0, 2);
}

// ── Address Normalization ─────────────────────────────────────

export interface RawAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  type?: string | null;
}

export function normalizeAddress(raw: Record<string, unknown> | null | undefined): RawAddress | null {
  if (!raw) return null;
  return {
    line1: (raw['line1'] ?? raw['address1'] ?? raw['street'] ?? null) as string | null,
    line2: (raw['line2'] ?? raw['address2'] ?? null) as string | null,
    city: (raw['city'] ?? raw['town'] ?? null) as string | null,
    state: (raw['state'] ?? raw['province'] ?? raw['region'] ?? null) as string | null,
    postalCode: (raw['postalCode'] ?? raw['zipCode'] ?? raw['zip'] ?? raw['pin'] ?? null) as string | null,
    country: normalizeCountry((raw['country'] ?? null) as string | null),
    type: (raw['type'] ?? null) as string | null,
  };
}

// ── Pagination Normalization ──────────────────────────────────

export function normalizePaginationInput(
  page: number | undefined | null,
  limit: number | undefined | null,
): { page: number; limit: number; offset: number } {
  const p = Math.max(1, page ?? 1);
  const l = Math.min(100, Math.max(1, limit ?? 20));
  return { page: p, limit: l, offset: (p - 1) * l };
}

// ── Date Normalization ────────────────────────────────────────

export function normalizeDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? null : d;
}

// ── External Reference Mapping ────────────────────────────────

export function buildExternalReference(
  providerCode: string,
  externalId: string,
  externalUrl?: string | null,
  externalType?: string | null,
): ExternalReference {
  return {
    providerCode,
    externalId,
    externalUrl: externalUrl ?? null,
    externalType: externalType ?? null,
    syncedAt: new Date(),
  };
}

// ── Verification Status Mapping ───────────────────────────────

const VERIFICATION_MAP: Record<string, NormalizedVerificationStatus> = {
  'VERIFIED': NormalizedVerificationStatus.VERIFIED,
  'GOLD': NormalizedVerificationStatus.VERIFIED,
  'PREMIUM': NormalizedVerificationStatus.VERIFIED,
  'AUTHENTICATED': NormalizedVerificationStatus.VERIFIED,
  'ASSESSED': NormalizedVerificationStatus.VERIFIED,
  'TRUSTED': NormalizedVerificationStatus.VERIFIED,
  'PENDING': NormalizedVerificationStatus.PENDING,
  'UNDER_REVIEW': NormalizedVerificationStatus.PENDING,
  'REVIEWING': NormalizedVerificationStatus.PENDING,
  'REJECTED': NormalizedVerificationStatus.REJECTED,
  'FAILED': NormalizedVerificationStatus.REJECTED,
  'EXPIRED': NormalizedVerificationStatus.EXPIRED,
  'LAPSED': NormalizedVerificationStatus.EXPIRED,
};

export function normalizeVerificationStatus(
  raw: string | null | undefined,
): NormalizedVerificationStatus {
  if (!raw) return NormalizedVerificationStatus.UNVERIFIED;
  return VERIFICATION_MAP[raw.toUpperCase()] ?? NormalizedVerificationStatus.UNVERIFIED;
}

// ── Shipment Status Mapping ───────────────────────────────────

const SHIPMENT_STATUS_MAP: Record<string, NormalizedShipmentStatus> = {
  'IN_TRANSIT': NormalizedShipmentStatus.IN_TRANSIT,
  'INTRANSIT': NormalizedShipmentStatus.IN_TRANSIT,
  'IN TRANSIT': NormalizedShipmentStatus.IN_TRANSIT,
  'SHIPPED': NormalizedShipmentStatus.IN_TRANSIT,
  'DISPATCHED': NormalizedShipmentStatus.IN_TRANSIT,
  'OUT_FOR_DELIVERY': NormalizedShipmentStatus.OUT_FOR_DELIVERY,
  'OUT FOR DELIVERY': NormalizedShipmentStatus.OUT_FOR_DELIVERY,
  'DELIVERED': NormalizedShipmentStatus.DELIVERED,
  'DELIVERY_CONFIRMED': NormalizedShipmentStatus.DELIVERED,
  'EXCEPTION': NormalizedShipmentStatus.EXCEPTION,
  'FAILED_DELIVERY': NormalizedShipmentStatus.EXCEPTION,
  'HELD': NormalizedShipmentStatus.EXCEPTION,
  'RETURNED': NormalizedShipmentStatus.RETURNED,
  'RETURN_TO_SENDER': NormalizedShipmentStatus.RETURNED,
  'PENDING': NormalizedShipmentStatus.PENDING,
  'PROCESSING': NormalizedShipmentStatus.PENDING,
  'LABEL_CREATED': NormalizedShipmentStatus.PENDING,
};

export function normalizeShipmentStatus(raw: string | null | undefined): NormalizedShipmentStatus {
  if (!raw) return NormalizedShipmentStatus.UNKNOWN;
  const upper = raw.toUpperCase().replace(/-/g, '_');
  return SHIPMENT_STATUS_MAP[upper] ?? NormalizedShipmentStatus.UNKNOWN;
}

// ── Provider Error Mapping ────────────────────────────────────

const HTTP_STATUS_TO_ERROR: Record<number, ProviderErrorCode> = {
  400: ProviderErrorCode.INVALID_REQUEST,
  401: ProviderErrorCode.AUTH_FAILED,
  403: ProviderErrorCode.AUTH_FAILED,
  404: ProviderErrorCode.NOT_FOUND,
  422: ProviderErrorCode.INVALID_REQUEST,
  429: ProviderErrorCode.RATE_LIMITED,
  500: ProviderErrorCode.PROVIDER_UNAVAILABLE,
  502: ProviderErrorCode.PROVIDER_UNAVAILABLE,
  503: ProviderErrorCode.PROVIDER_UNAVAILABLE,
  504: ProviderErrorCode.TIMEOUT,
};

export function mapHttpStatusToErrorCode(status: number): ProviderErrorCode {
  return HTTP_STATUS_TO_ERROR[status] ?? ProviderErrorCode.UNKNOWN;
}

export function isRetryableErrorCode(code: ProviderErrorCode): boolean {
  return [
    ProviderErrorCode.TIMEOUT,
    ProviderErrorCode.NETWORK_ERROR,
    ProviderErrorCode.RATE_LIMITED,
    ProviderErrorCode.PROVIDER_UNAVAILABLE,
  ].includes(code);
}

export function buildAdapterError(
  code: ProviderErrorCode,
  message: string,
  providerCode: string,
  httpStatus?: number | null,
  providerErrorCode?: string | null,
  details?: unknown,
): AdapterError {
  return {
    code,
    message,
    providerCode,
    retryable: isRetryableErrorCode(code),
    httpStatus: httpStatus ?? null,
    providerErrorCode: providerErrorCode ?? null,
    details,
  };
}

// ── Log Sanitization ──────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'apikey', 'api_key', 'authorization',
  'x-api-key', 'x-auth-token', 'credential', 'private_key', 'privatekey',
  'access_key', 'accesskey', 'signature', 'client_secret', 'clientsecret',
  'webhook_secret', 'webhooksecret',
]);

export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeForLog(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Metric Helpers ────────────────────────────────────────────

export function buildMetricEvent(
  context: AdapterRequestContext,
  durationMs: number,
  success: boolean,
  attempt: number,
  httpStatus?: number | null,
  errorCode?: string | null,
): AdapterMetricEvent {
  return {
    providerCode: context.providerCode,
    capability: context.capability,
    strategy: context.strategy,
    workspaceId: context.workspaceId,
    success,
    durationMs,
    attempt,
    httpStatus: httpStatus ?? null,
    errorCode: errorCode ?? null,
    timestamp: new Date(),
  };
}

// ── Audit Event Helpers ───────────────────────────────────────

export function buildAuditEvent(
  context: AdapterRequestContext,
  durationMs: number,
  success: boolean,
  attempt: number,
  errorCode?: string | null,
): AdapterAuditEvent {
  return {
    correlationId: context.correlationId,
    requestId: context.requestId,
    workspaceId: context.workspaceId,
    providerCode: context.providerCode,
    capability: context.capability,
    strategy: context.strategy,
    userId: context.userId ?? null,
    success,
    durationMs,
    attempt,
    errorCode: errorCode ?? null,
    idempotencyKey: context.idempotencyKey ?? null,
    timestamp: new Date(),
  };
}

// ── Response Metadata ─────────────────────────────────────────

export function buildResponseMetadata(
  context: AdapterRequestContext,
  durationMs: number,
  attempt: number,
  extra?: Partial<AdapterResponseMetadata>,
): AdapterResponseMetadata {
  return {
    correlationId: context.correlationId,
    requestId: context.requestId,
    providerCode: context.providerCode,
    capability: context.capability,
    strategy: context.strategy,
    durationMs,
    attempt,
    totalAttempts: attempt,
    rateLimitRemaining: extra?.rateLimitRemaining ?? null,
    rateLimitReset: extra?.rateLimitReset ?? null,
    providerRawMeta: extra?.providerRawMeta ?? null,
  };
}
