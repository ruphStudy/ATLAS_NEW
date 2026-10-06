import { classifyAmazonAuthFailure } from '../auth/amazon-auth-error.classifier';

function axiosError(status: number, data?: Record<string, unknown>) {
  return { response: { status, data } };
}

describe('classifyAmazonAuthFailure', () => {
  it('classifies invalid_grant as REAUTH_REQUIRED (revoked/expired refresh token)', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { error: 'invalid_grant' }));
    expect(result.classification).toBe('REAUTH_REQUIRED');
  });

  it('classifies invalid_client as CONFIG_ERROR, not REAUTH_REQUIRED (global misconfiguration, not this seller)', () => {
    const result = classifyAmazonAuthFailure(axiosError(401, { error: 'invalid_client' }));
    expect(result.classification).toBe('CONFIG_ERROR');
  });

  it('classifies HTTP 401/403 without a specific error code as REAUTH_REQUIRED', () => {
    expect(classifyAmazonAuthFailure(axiosError(401)).classification).toBe('REAUTH_REQUIRED');
    expect(classifyAmazonAuthFailure(axiosError(403)).classification).toBe('REAUTH_REQUIRED');
  });

  it('classifies HTTP 429 (throttling) as TRANSIENT', () => {
    expect(classifyAmazonAuthFailure(axiosError(429)).classification).toBe('TRANSIENT');
  });

  it('classifies HTTP 5xx as TRANSIENT', () => {
    expect(classifyAmazonAuthFailure(axiosError(500)).classification).toBe('TRANSIENT');
    expect(classifyAmazonAuthFailure(axiosError(503)).classification).toBe('TRANSIENT');
  });

  it('classifies network errors (timeout/DNS/connection reset) as TRANSIENT', () => {
    expect(classifyAmazonAuthFailure(new Error('connect ETIMEDOUT')).classification).toBe('TRANSIENT');
    expect(classifyAmazonAuthFailure(new Error('getaddrinfo ENOTFOUND api.amazon.com')).classification).toBe('TRANSIENT');
    expect(classifyAmazonAuthFailure(new Error('socket hang up ECONNRESET')).classification).toBe('TRANSIENT');
  });

  it('never includes token/secret values in the returned reason', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { error: 'invalid_grant', error_description: 'refresh_token=SECRET123' }));
    expect(result.reason).not.toContain('SECRET123');
  });

  // ── Regression coverage for the swallowed-error fix ──────────────

  it('classifies a plain 400 (no OAuth error code) as REQUEST_ERROR, not "unclassified"', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { errors: [{ code: 'InvalidInput', message: 'keywords is a required parameter' }] }));
    expect(result.classification).toBe('REQUEST_ERROR');
  });

  it('extracts Amazon\'s REST-API error shape ({errors:[{code,message}]}), used by Catalog Items and other SP-API endpoints (distinct from the OAuth {error} shape)', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { errors: [{ code: 'InvalidInput', message: 'keywords is a required parameter' }] }));
    expect(result.amazonErrorCode).toBe('InvalidInput');
    expect(result.reason).toContain('InvalidInput');
    expect(result.reason).toContain('keywords is a required parameter');
  });

  it('includes the real HTTP status in both the reason text and the httpStatus field', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { errors: [{ code: 'InvalidInput', message: 'bad request' }] }));
    expect(result.httpStatus).toBe(400);
    expect(result.reason).toContain('400');
  });

  it('includes the endpoint/path in the reason when supplied', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { errors: [{ code: 'InvalidInput', message: 'bad request' }] }), '/catalog/2022-04-01/items');
    expect(result.reason).toContain('/catalog/2022-04-01/items');
  });

  it('classifies an error with no HTTP response at all as MALFORMED_RESPONSE and preserves the real error message (e.g. our own code failing on an unexpected Amazon response shape), instead of a generic "unclassified" label', () => {
    const result = classifyAmazonAuthFailure(new TypeError("Cannot read properties of undefined (reading 'map')"));
    expect(result.classification).toBe('MALFORMED_RESPONSE');
    expect(result.reason).toContain("Cannot read properties of undefined (reading 'map')");
  });

  it('scrubs anything shaped like a credential out of Amazon\'s own error message text (defense in depth)', () => {
    const result = classifyAmazonAuthFailure(axiosError(400, { errors: [{ code: 'X', message: 'token: abc123 was rejected' }] }));
    expect(result.reason).not.toContain('abc123');
    expect(result.reason).toContain('[REDACTED]');
  });
});
