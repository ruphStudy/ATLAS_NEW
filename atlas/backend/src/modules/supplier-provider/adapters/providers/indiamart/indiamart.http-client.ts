import { Logger } from '@nestjs/common';
import { ProviderErrorCode } from '../../../interfaces';
import {
  INDIAMART_DEFAULT_BASE_URL,
  INDIAMART_HTTP_STATUS,
} from './indiamart.constants';
import {
  IndiaMartApiEnvelope,
  IndiaMartRequestOptions,
} from './indiamart.types';
import { sanitizeHeaders } from '../../adapter.mappers';

/**
 * IndiaMartHttpClient
 *
 * Thin HTTP wrapper for all IndiaMART API calls.
 * - Injects authentication headers per workspace credential set.
 * - Sanitizes headers before logging (no API key exposure).
 * - Parses the IndiaMART response envelope.
 * - Normalizes HTTP / envelope errors into a consistent shape.
 */
export class IndiaMartHttpClient {
  private readonly logger = new Logger(IndiaMartHttpClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly mobileNumber: string | null,
  ) {}

  async request<T = unknown>(options: IndiaMartRequestOptions): Promise<IndiaMartApiEnvelope<T>> {
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
      'glusr_crm_key': this.apiKey,
    };
    if (this.mobileNumber) {
      headers['mobile_no'] = this.mobileNumber;
    }

    this.logger.debug(
      `[INDIAMART] ${method} ${url} headers=${JSON.stringify(sanitizeHeaders(headers))}`,
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
        throw new IndiaMartHttpError(ProviderErrorCode.TIMEOUT, `Request timed out after ${timeoutMs}ms`, null);
      }
      throw new IndiaMartHttpError(ProviderErrorCode.NETWORK_ERROR, err.message, null);
    }
    clearTimeout(timeoutId);

    const text = await response.text().catch(() => '');

    if (response.status === INDIAMART_HTTP_STATUS.UNAUTHORIZED || response.status === INDIAMART_HTTP_STATUS.FORBIDDEN) {
      throw new IndiaMartHttpError(ProviderErrorCode.AUTH_FAILED, 'IndiaMART authentication failed', response.status);
    }
    if (response.status === INDIAMART_HTTP_STATUS.NOT_FOUND) {
      throw new IndiaMartHttpError(ProviderErrorCode.NOT_FOUND, 'IndiaMART resource not found', response.status);
    }
    if (response.status === INDIAMART_HTTP_STATUS.RATE_LIMITED) {
      throw new IndiaMartHttpError(ProviderErrorCode.RATE_LIMITED, 'IndiaMART rate limit exceeded', response.status);
    }
    if (response.status >= INDIAMART_HTTP_STATUS.SERVER_ERROR) {
      throw new IndiaMartHttpError(ProviderErrorCode.PROVIDER_UNAVAILABLE, `IndiaMART server error: HTTP ${response.status}`, response.status);
    }
    if (!response.ok) {
      throw new IndiaMartHttpError(ProviderErrorCode.INVALID_REQUEST, `IndiaMART request failed: HTTP ${response.status}`, response.status);
    }

    let parsed: IndiaMartApiEnvelope<T>;
    try {
      parsed = JSON.parse(text) as IndiaMartApiEnvelope<T>;
    } catch {
      throw new IndiaMartHttpError(ProviderErrorCode.PARSE_ERROR, 'IndiaMART returned an unparseable response', response.status);
    }

    // Check IndiaMART envelope-level error codes
    const envelopeStatus = parsed.Status ?? parsed.CODE;
    const envelopeError = parsed.error ?? parsed.ERROR ?? parsed.message ?? parsed.MESSAGE;

    if (envelopeStatus !== undefined && envelopeStatus !== null) {
      const statusNum = typeof envelopeStatus === 'number' ? envelopeStatus : parseInt(String(envelopeStatus), 10);
      if (!isNaN(statusNum) && statusNum !== 200 && statusNum !== 0) {
        const msg = typeof envelopeError === 'string' ? envelopeError : `IndiaMART API error code ${statusNum}`;
        throw new IndiaMartHttpError(this.mapEnvelopeStatus(statusNum), msg, statusNum);
      }
    }

    return parsed;
  }

  private buildUrl(path: string, params: Record<string, string | number | boolean | undefined>): string {
    const base = (this.baseUrl || INDIAMART_DEFAULT_BASE_URL).replace(/\/$/, '');
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return query ? `${base}${path}?${query}` : `${base}${path}`;
  }

  private mapEnvelopeStatus(code: number): ProviderErrorCode {
    if (code === 401 || code === 403) return ProviderErrorCode.AUTH_FAILED;
    if (code === 404) return ProviderErrorCode.NOT_FOUND;
    if (code === 429) return ProviderErrorCode.RATE_LIMITED;
    if (code >= 500) return ProviderErrorCode.PROVIDER_UNAVAILABLE;
    return ProviderErrorCode.UNKNOWN;
  }
}

// ── HTTP Client Error ─────────────────────────────────────────

export class IndiaMartHttpError extends Error {
  constructor(
    public readonly errorCode: ProviderErrorCode,
    message: string,
    public readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = 'IndiaMartHttpError';
  }
}
