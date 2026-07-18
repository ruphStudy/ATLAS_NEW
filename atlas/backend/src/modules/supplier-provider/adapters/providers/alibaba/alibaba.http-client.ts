import { Logger } from '@nestjs/common';
import { ProviderErrorCode } from '../../../interfaces';
import { sanitizeHeaders } from '../../adapter.mappers';
import { AlibabaRequestSigner } from './alibaba.auth';
import {
  ALIBABA_API_METHODS,
  ALIBABA_DEFAULT_BASE_URL,
  ALIBABA_ERROR_CODES,
  ALIBABA_HTTP_STATUS,
} from './alibaba.constants';
import {
  AlibabaApiEnvelope,
  AlibabaRequestOptions,
  AlibabaTokenRefreshResponse,
} from './alibaba.types';

/**
 * AlibabaHttpClient
 *
 * Thin HTTP wrapper for Alibaba Open Platform API calls.
 * - Signs every request with HMAC-SHA256 via AlibabaRequestSigner.
 * - Injects access token as session parameter (never in log output).
 * - Parses Alibaba response envelope and maps error codes.
 * - Supports token refresh via dedicated method.
 */
export class AlibabaHttpClient {
  private readonly logger = new Logger(AlibabaHttpClient.name);
  private readonly signer: AlibabaRequestSigner;

  constructor(
    private readonly baseUrl: string,
    private readonly appKey: string,
    appSecret: string,
    private accessToken: string,
    private refreshToken: string | null,
  ) {
    this.signer = new AlibabaRequestSigner(appKey, appSecret);
  }

  async request<T = unknown>(options: AlibabaRequestOptions): Promise<AlibabaApiEnvelope<T>> {
    const { method, params = {}, body, timeoutMs = 25_000 } = options;

    const signedParams = this.signer.buildSignedParams(
      method,
      params as Record<string, string | number | boolean | undefined>,
      this.accessToken,
    );

    if (body) {
      for (const [k, v] of Object.entries(body)) {
        signedParams[k] = JSON.stringify(v);
      }
      // Re-sign after adding body params
      const allWithoutSign: Record<string, string> = { ...signedParams };
      delete allWithoutSign['sign'];
      allWithoutSign['sign'] = this.signer.sign(allWithoutSign);
      Object.assign(signedParams, allWithoutSign);
    }

    const url = this.baseUrl || ALIBABA_DEFAULT_BASE_URL;
    const formBody = new URLSearchParams(signedParams).toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };

    this.logger.debug(
      `[ALIBABA] POST ${url} method=${method} params=${JSON.stringify(this.signer.toSafeLogEntry(signedParams))}`,
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: formBody,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const err = error as Error;
      if (err.name === 'AbortError') {
        throw new AlibabaHttpError(ProviderErrorCode.TIMEOUT, `Alibaba request timed out after ${timeoutMs}ms`, null);
      }
      throw new AlibabaHttpError(ProviderErrorCode.NETWORK_ERROR, err.message, null);
    }
    clearTimeout(timeoutId);

    const text = await response.text().catch(() => '');

    if (response.status === ALIBABA_HTTP_STATUS.UNAUTHORIZED || response.status === ALIBABA_HTTP_STATUS.FORBIDDEN) {
      throw new AlibabaHttpError(ProviderErrorCode.AUTH_FAILED, 'Alibaba authentication failed', response.status);
    }
    if (response.status === ALIBABA_HTTP_STATUS.NOT_FOUND) {
      throw new AlibabaHttpError(ProviderErrorCode.NOT_FOUND, 'Alibaba resource not found', response.status);
    }
    if (response.status === ALIBABA_HTTP_STATUS.RATE_LIMITED) {
      throw new AlibabaHttpError(ProviderErrorCode.RATE_LIMITED, 'Alibaba rate limit exceeded', response.status);
    }
    if (response.status >= ALIBABA_HTTP_STATUS.SERVER_ERROR) {
      throw new AlibabaHttpError(ProviderErrorCode.PROVIDER_UNAVAILABLE, `Alibaba server error: HTTP ${response.status}`, response.status);
    }
    if (!response.ok) {
      throw new AlibabaHttpError(ProviderErrorCode.INVALID_REQUEST, `Alibaba request failed: HTTP ${response.status}`, response.status);
    }

    let parsed: AlibabaApiEnvelope<T>;
    try {
      parsed = JSON.parse(text) as AlibabaApiEnvelope<T>;
    } catch {
      throw new AlibabaHttpError(ProviderErrorCode.PARSE_ERROR, 'Alibaba returned an unparseable response', response.status);
    }

    if (parsed.error_response) {
      const errResp = parsed.error_response;
      const subCode = errResp.sub_code ?? '';
      const msg = errResp.sub_msg ?? errResp.msg ?? 'Alibaba API error';
      throw new AlibabaHttpError(this.mapSubCode(subCode), msg, errResp.code ? Number(errResp.code) : null);
    }

    return parsed;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Updates internal state; caller must persist the new tokens.
   */
  async refreshAccessToken(): Promise<AlibabaTokenRefreshResponse> {
    if (!this.refreshToken) {
      throw new AlibabaHttpError(ProviderErrorCode.AUTH_FAILED, 'No refresh token available for Alibaba', null);
    }

    const signedParams = this.signer.buildSignedParams(
      ALIBABA_API_METHODS.TOKEN_REFRESH,
      { refresh_token: this.refreshToken },
      null,
    );

    const url = this.baseUrl || ALIBABA_DEFAULT_BASE_URL;
    const formBody = new URLSearchParams(signedParams).toString();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const err = error as Error;
      throw new AlibabaHttpError(ProviderErrorCode.NETWORK_ERROR, err.message, null);
    }
    clearTimeout(timeoutId);

    const text = await response.text().catch(() => '');
    let tokenData: { top_auth_token_refresh_response?: AlibabaTokenRefreshResponse };
    try {
      tokenData = JSON.parse(text);
    } catch {
      throw new AlibabaHttpError(ProviderErrorCode.PARSE_ERROR, 'Token refresh response unparseable', response.status);
    }

    const result = tokenData.top_auth_token_refresh_response;
    if (!result?.access_token) {
      throw new AlibabaHttpError(ProviderErrorCode.AUTH_FAILED, 'Token refresh failed: no access_token returned', null);
    }

    // Update internal token
    this.accessToken = result.access_token;
    if (result.refresh_token) this.refreshToken = result.refresh_token;

    return result;
  }

  /** Current access token (never logged externally). */
  getAccessToken(): string {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  private mapSubCode(subCode: string): ProviderErrorCode {
    if (subCode === ALIBABA_ERROR_CODES.INVALID_SESSION || subCode === ALIBABA_ERROR_CODES.SESSION_EXPIRED) {
      return ProviderErrorCode.AUTH_FAILED;
    }
    if (subCode === ALIBABA_ERROR_CODES.RATE_LIMITED || subCode === ALIBABA_ERROR_CODES.ACCESS_DENIED) {
      return ProviderErrorCode.RATE_LIMITED;
    }
    if (subCode === ALIBABA_ERROR_CODES.PERMISSION_DENIED) {
      return ProviderErrorCode.AUTH_FAILED;
    }
    if (subCode === ALIBABA_ERROR_CODES.PARAM_ERROR) {
      return ProviderErrorCode.INVALID_REQUEST;
    }
    return ProviderErrorCode.UNKNOWN;
  }
}

// ── HTTP Error ────────────────────────────────────────────────

export class AlibabaHttpError extends Error {
  constructor(
    public readonly errorCode: ProviderErrorCode,
    message: string,
    public readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = 'AlibabaHttpError';
  }
}
