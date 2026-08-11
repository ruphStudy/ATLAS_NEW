import { randomBytes } from 'crypto';
import { OAUTH_NONCE_BYTES, OAUTH_STATE_BYTES } from './constants';

/** CSRF-protection token bound to one `OAuthAuthorizationRequest` — validated on callback before any token exchange happens. */
export function generateState(): string {
  return randomBytes(OAUTH_STATE_BYTES).toString('base64url');
}

/** Replay-protection value passed through the provider and echoed back in the token response/ID token where the provider supports it. */
export function generateNonce(): string {
  return randomBytes(OAUTH_NONCE_BYTES).toString('base64url');
}
