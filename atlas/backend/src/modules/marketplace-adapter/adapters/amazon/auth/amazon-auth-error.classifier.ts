export type AmazonAuthFailureClass =
  | 'TRANSIENT'
  | 'REAUTH_REQUIRED'
  | 'CONFIG_ERROR'
  | 'REQUEST_ERROR'
  | 'MALFORMED_RESPONSE';

export interface AmazonAuthFailure {
  classification: AmazonAuthFailureClass;
  /** Safe, secret-free summary — includes real HTTP status/Amazon error code/message when available. Never includes token/credential values. */
  reason: string;
  httpStatus?: number;
  amazonErrorCode?: string;
}

/**
 * Distinguishes a temporary Amazon SP-API/LWA failure (network blip, 5xx,
 * throttling) from a definitive "this seller's refresh token is no longer
 * valid" failure (invalid_grant), from an ATLAS-side global misconfiguration
 * (invalid_client — wrong clientId/clientSecret, which would affect every
 * seller, not just one), from a rejected/malformed request (4xx that isn't
 * an auth problem — bad params, unsupported marketplace, etc.), and from an
 * error that never reached Amazon's HTTP layer at all (no `response` on the
 * error — most likely our own code failing to process an unexpected/minimal
 * response shape, e.g. a sandbox stub response).
 *
 * Every branch keeps the real HTTP status and Amazon's own error code/message
 * in `reason` (and the separate `httpStatus`/`amazonErrorCode` fields) rather
 * than reducing to a generic label — losing that detail is exactly what made
 * failures impossible to diagnose before this fix.
 *
 * Only inspects status codes and Amazon's own returned error code/message —
 * never the outgoing request (`error.config`/`error.request`), which is
 * where a token/secret we sent could appear. Amazon's error message text is
 * also defensively scrubbed of anything shaped like a credential before
 * being surfaced, even though Amazon has no reason to echo ours back.
 */
export function classifyAmazonAuthFailure(err: unknown, endpoint?: string): AmazonAuthFailure {
  const status = extractStatus(err);
  const { code: amazonErrorCode, message: amazonMessage } = extractAmazonErrorDetails(err);
  const suffix = endpoint ? ` [${endpoint}]` : '';
  const detail = amazonMessage ? `: ${amazonMessage}` : '';

  if (amazonErrorCode === 'invalid_grant') {
    return {
      classification: 'REAUTH_REQUIRED',
      reason: `Amazon rejected the refresh token (invalid_grant)${detail}${suffix}`,
      httpStatus: status,
      amazonErrorCode,
    };
  }
  if (amazonErrorCode === 'invalid_client' || amazonErrorCode === 'unauthorized_client') {
    return {
      classification: 'CONFIG_ERROR',
      reason: `Amazon rejected ATLAS's own SP-API client credentials (${amazonErrorCode})${detail}${suffix} — check AMAZON_SP_API_CLIENT_ID/SECRET`,
      httpStatus: status,
      amazonErrorCode,
    };
  }

  if (status === 401 || status === 403) {
    return {
      classification: 'REAUTH_REQUIRED',
      reason: `Amazon returned HTTP ${status}${amazonErrorCode ? ` (${amazonErrorCode})` : ''}${detail}${suffix}`,
      httpStatus: status,
      amazonErrorCode,
    };
  }
  if (status === 429) {
    return {
      classification: 'TRANSIENT',
      reason: `Amazon rate-limited the request (HTTP 429)${detail}${suffix}`,
      httpStatus: status,
      amazonErrorCode,
    };
  }
  if (typeof status === 'number' && status >= 500) {
    return {
      classification: 'TRANSIENT',
      reason: `Amazon returned a server error (HTTP ${status})${detail}${suffix}`,
      httpStatus: status,
      amazonErrorCode,
    };
  }
  if (typeof status === 'number' && status >= 400) {
    // A definitive 4xx we don't have a specific bucket for (400/404/409/422/…)
    // — a rejected/malformed request, not a credential or transient issue.
    return {
      classification: 'REQUEST_ERROR',
      reason: `Amazon rejected the request (HTTP ${status}${amazonErrorCode ? ` ${amazonErrorCode}` : ''})${detail}${suffix}`,
      httpStatus: status,
      amazonErrorCode,
    };
  }

  const message = err instanceof Error ? err.message : String(err);
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|timeout/i.test(message)) {
    return {
      classification: 'TRANSIENT',
      reason: `Network error contacting Amazon${suffix}: ${message}`,
      httpStatus: status,
    };
  }

  // No HTTP status at all — err.response is absent, so this never reached
  // Amazon's HTTP layer as a rejected request. Most likely our own
  // response-processing code threw on an unexpected/minimal Amazon response
  // shape. Surface the real error name/message (safe — never a credential)
  // instead of a generic "unclassified" label that discards the diagnosis.
  return {
    classification: 'MALFORMED_RESPONSE',
    reason: `Unexpected error processing Amazon's response${suffix}: ${err instanceof Error ? `${err.name}: ${message}` : message}`,
    httpStatus: status,
    amazonErrorCode,
  };
}

function extractStatus(err: unknown): number | undefined {
  const anyErr = err as { status?: number; response?: { status?: number } } | undefined;
  return anyErr?.status ?? anyErr?.response?.status;
}

/**
 * Amazon uses two different error-body shapes depending on the endpoint:
 *   - LWA/OAuth token endpoint: `{ error, error_description }`
 *   - SP-API REST endpoints (Catalog Items, etc.): `{ errors: [{ code, message, details }] }`
 * Both are checked; whichever is present wins.
 */
function extractAmazonErrorDetails(err: unknown): { code?: string; message?: string } {
  const anyErr = err as { response?: { data?: any } } | undefined;
  const data = anyErr?.response?.data;
  if (!data || typeof data !== 'object') {
    return {};
  }

  if (typeof data.error === 'string') {
    return { code: data.error, message: sanitizeAmazonMessage(data.error_description) };
  }
  if (Array.isArray(data.errors) && data.errors[0]) {
    return { code: data.errors[0].code, message: sanitizeAmazonMessage(data.errors[0].message) };
  }
  return {};
}

/** Defense in depth: Amazon should never echo a credential back, but scrub anything shaped like one anyway before logging/returning it. */
function sanitizeAmazonMessage(message: unknown): string | undefined {
  if (typeof message !== 'string') {
    return undefined;
  }
  return message
    .replace(/(token|secret|key|password)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .slice(0, 500);
}
