import { Logger } from '@nestjs/common';
import { ProviderErrorCode } from '../../../interfaces';
import { sanitizeHeaders } from '../../adapter.mappers';
import {
  TRADEINDIA_DEFAULT_BASE_URL,
  TRADEINDIA_HTTP_STATUS,
} from './tradeindia.constants';
import {
  TradeIndiaApiEnvelope,
  TradeIndiaRequestOptions,
} from './tradeindia.types';

/**
 * TradeIndiaHttpClient
 *
 * Thin HTTP wrapper for all TradeIndia API calls.
 * - Injects authentication headers per workspace credential set.
 * - Sanitizes headers before any log output (no API key exposure).
 * - Parses the TradeIndia response envelope.
 * - Normalizes HTTP / envelope errors into a consistent shape.
 */
export class TradeIndiaHttpClient {
  private readonly logger = new Logger(TradeIndiaHttpClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly userId: string | null,
  ) {}

  async request<T = unknown>(options: TradeIndiaRequestOptions): Promise<TradeIndiaApiEnvelope<T>> {
    const {
      path,
      params = {},
      body,
      method = 'GET',
      timeoutMs = 20_000,
    } = options;

    const url = this.buildUrl(path, params);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Api-Key': this.apiKey,
    };
    if (this.userId) {
      headers['X-User-Id'] = this.userId;
    }

    this.logger.debug(
      `[TRADEINDIA] ${method} ${url} headers=${JSON.stringify(sanitizeHeaders(headers))}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const err = error as Error;
      if (err.name === 'AbortError') {
        throw new TradeIndiaHttpError(ProviderErrorCode.TIMEOUT, `TradeIndia request timed out after ${timeoutMs}ms`, null);
      }
      throw new TradeIndiaHttpError(ProviderErrorCode.NETWORK_ERROR, err.message, null);
    }
    clearTimeout(timeoutId);

    const text = await response.text().catch(() => '');

    if (response.status === TRADEINDIA_HTTP_STATUS.UNAUTHORIZED || response.status === TRADEINDIA_HTTP_STATUS.FORBIDDEN) {
      throw new TradeIndiaHttpError(ProviderErrorCode.AUTH_FAILED, 'TradeIndia authentication failed', response.status);
    }
    if (response.status === TRADEINDIA_HTTP_STATUS.NOT_FOUND) {
      throw new TradeIndiaHttpError(ProviderErrorCode.NOT_FOUND, 'TradeIndia resource not found', response.status);
    }
    if (response.status === TRADEINDIA_HTTP_STATUS.RATE_LIMITED) {
      throw new TradeIndiaHttpError(ProviderErrorCode.RATE_LIMITED, 'TradeIndia rate limit exceeded', response.status);
    }
    if (response.status >= TRADEINDIA_HTTP_STATUS.SERVER_ERROR) {
      throw new TradeIndiaHttpError(ProviderErrorCode.PROVIDER_UNAVAILABLE, `TradeIndia server error: HTTP ${response.status}`, response.status);
    }
    if (!response.ok) {
      throw new TradeIndiaHttpError(ProviderErrorCode.INVALID_REQUEST, `TradeIndia request failed: HTTP ${response.status}`, response.status);
    }

    let parsed: TradeIndiaApiEnvelope<T>;
    try {
      parsed = JSON.parse(text) as TradeIndiaApiEnvelope<T>;
    } catch {
      throw new TradeIndiaHttpError(ProviderErrorCode.PARSE_ERROR, 'TradeIndia returned an unparseable response', response.status);
    }

    const statusRaw = parsed.STATUS ?? parsed.status;
    const errorRaw = parsed.ERROR ?? parsed.error ?? parsed.message ?? parsed.MESSAGE;

    if (statusRaw !== undefined && statusRaw !== null) {
      const statusStr = String(statusRaw).toLowerCase();
      if (statusStr === 'error' || statusStr === 'fail' || statusStr === 'failed' || statusStr === '0') {
        const msg = typeof errorRaw === 'string' ? errorRaw : 'TradeIndia API returned an error';
        throw new TradeIndiaHttpError(ProviderErrorCode.UNKNOWN, msg, null);
      }
    }

    return parsed;
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean | undefined>): string {
    const base = (this.baseUrl || TRADEINDIA_DEFAULT_BASE_URL).replace(/\/$/, '');
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return query ? `${base}${path}?${query}` : `${base}${path}`;
  }
}

// ── HTTP Error ────────────────────────────────────────────────

export class TradeIndiaHttpError extends Error {
  constructor(
    public readonly errorCode: ProviderErrorCode,
    message: string,
    public readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = 'TradeIndiaHttpError';
  }
}
