import { createHmac } from 'crypto';
import { ALIBABA_API_FORMAT, ALIBABA_API_V, ALIBABA_SIGN_METHOD } from './alibaba.constants';

/**
 * AlibabaRequestSigner
 *
 * Implements HMAC-SHA256 request signing for the Alibaba Open Platform API.
 * The algorithm:
 *   1. Collect all request parameters (excluding sign itself).
 *   2. Sort by key name lexicographically.
 *   3. Concatenate as: appSecret + key1value1key2value2... + appSecret
 *   4. Compute HMAC-SHA256 of the concatenated string using appSecret as the key.
 *   5. Uppercase-hex-encode the digest.
 *
 * Reference: https://open.alibaba.com/doc/doc.htm#/marketTool/signature
 *
 * SECURITY: appSecret is NEVER included in any log output.
 */
export class AlibabaRequestSigner {
  constructor(private readonly appKey: string, private readonly appSecret: string) {}

  /**
   * Builds the full signed parameter map for a request.
   */
  buildSignedParams(
    apiMethod: string,
    params: Record<string, string | number | boolean | undefined>,
    accessToken: string | null,
    sessionKey?: string | null,
  ): Record<string, string> {
    const timestamp = this.buildTimestamp();

    const allParams: Record<string, string> = {
      method: apiMethod,
      app_key: this.appKey,
      timestamp,
      format: ALIBABA_API_FORMAT,
      v: ALIBABA_API_V,
      sign_method: ALIBABA_SIGN_METHOD,
    };

    if (accessToken) allParams['session'] = accessToken;
    if (sessionKey) allParams['session'] = sessionKey;

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        allParams[k] = String(v);
      }
    }

    allParams['sign'] = this.sign(allParams);
    return allParams;
  }

  /**
   * Computes the HMAC-SHA256 signature over the sorted parameter string.
   * appSecret used as HMAC key — never returned or logged.
   */
  sign(params: Record<string, string>): string {
    const sorted = Object.keys(params)
      .filter((k) => k !== 'sign')
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join('');

    const payload = this.appSecret + sorted + this.appSecret;

    return createHmac('sha256', this.appSecret)
      .update(payload, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  private buildTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /** Returns a safe representation with appSecret redacted — for logging only. */
  toSafeLogEntry(params: Record<string, string>): Record<string, string> {
    const safe = { ...params };
    delete safe['sign'];
    if ('session' in safe) safe['session'] = '[REDACTED]';
    return safe;
  }
}
