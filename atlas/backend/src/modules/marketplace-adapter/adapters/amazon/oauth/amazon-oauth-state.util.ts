import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT = 'atlas-amazon-oauth-state';
const KEY_LENGTH = 32;
const NONCE_BYTES = 16;
const STATE_TTL_MS = 10 * 60 * 1000; // mirrors oauth-management's AUTHORIZATION_REQUEST_TTL_MS

export interface AmazonOAuthStatePayload {
  workspaceId: string;
  userId: string;
  /** ISO country code (e.g. 'US', 'IN') identifying which Amazon marketplace this authorization targets. */
  country: string;
  /** Present only for a reconnect — the existing MarketplaceAccount to update rather than create anew. */
  accountId?: string;
  nonce: string;
  iat: number;
  exp: number;
}

export type AmazonOAuthStateValidation =
  | { valid: true; payload: AmazonOAuthStatePayload }
  | { valid: false; reason: 'MALFORMED' | 'TAMPERED' | 'EXPIRED' };

/**
 * Stateless, tamper-resistant CSRF-protection token for the Amazon OAuth flow.
 *
 * No server-side storage (no new Prisma table): the state value itself is
 * `base64url(payload).base64url(hmac)` — carrying workspaceId/userId/marketplace
 * /accountId/expiry, verified via constant-time HMAC comparison on callback.
 * A replayed state alone cannot complete a token exchange without a fresh,
 * single-use `spapi_oauth_code` from Amazon, so no separate consumed-state
 * tracking is required beyond the short TTL below.
 *
 * The signing key is derived from ATLAS_CREDENTIAL_KEY (same passphrase used
 * for credential-at-rest encryption elsewhere in this codebase) via a
 * domain-separated scrypt derivation, so no new secret/env var is needed.
 */
@Injectable()
export class AmazonOAuthStateSigner {
  sign(payload: Omit<AmazonOAuthStatePayload, 'nonce' | 'iat' | 'exp'>): { state: string; expiresAt: Date } {
    const now = Date.now();
    const full: AmazonOAuthStatePayload = {
      ...payload,
      nonce: randomBytes(NONCE_BYTES).toString('base64url'),
      iat: now,
      exp: now + STATE_TTL_MS,
    };

    const encodedPayload = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
    const signature = this.hmac(encodedPayload);
    return { state: `${encodedPayload}.${signature}`, expiresAt: new Date(full.exp) };
  }

  verify(state: string): AmazonOAuthStateValidation {
    const parts = state.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { valid: false, reason: 'MALFORMED' };
    }
    const [encodedPayload, signature] = parts as [string, string];

    const expectedSignature = this.hmac(encodedPayload);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return { valid: false, reason: 'TAMPERED' };
    }

    let payload: AmazonOAuthStatePayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      return { valid: false, reason: 'MALFORMED' };
    }

    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return { valid: false, reason: 'EXPIRED' };
    }
    if (!payload.workspaceId || !payload.userId || !payload.country || !payload.nonce) {
      return { valid: false, reason: 'MALFORMED' };
    }

    return { valid: true, payload };
  }

  private hmac(encodedPayload: string): string {
    const key = this.deriveKey();
    return createHmac('sha256', key).update(encodedPayload).digest('base64url');
  }

  private deriveKey(): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'];
    if (!passphrase) {
      throw new Error('ATLAS_CREDENTIAL_KEY is not set — refusing to sign/verify OAuth state without it');
    }
    return scryptSync(passphrase, SALT, KEY_LENGTH) as Buffer;
  }
}
