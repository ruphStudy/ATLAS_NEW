import { randomBytes } from 'crypto';
import { SSO_NONCE_BYTES, SSO_STATE_BYTES } from './constants';

/** CSRF/replay-protection token bound to one `SsoLoginRequest` — validated on ACS/callback before any assertion/token processing happens. */
export function generateState(): string {
  return randomBytes(SSO_STATE_BYTES).toString('base64url');
}

/** OIDC nonce — bound into the authorization request and re-checked against the ID token's `nonce` claim. */
export function generateNonce(): string {
  return randomBytes(SSO_NONCE_BYTES).toString('base64url');
}
