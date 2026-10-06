import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createPublicKey, createVerify } from 'crypto';
import { JWKS_CACHE_TTL_MS, SSO_REQUEST_TIMEOUT_MS } from '../constants';

export interface IOidcVerificationResult {
  valid: boolean;
  claims?: Record<string, unknown>;
  error?: string;
}

interface IJwk {
  kty: string;
  kid?: string;
  n?: string;
  e?: string;
  x5c?: string[];
  [key: string]: unknown;
}

interface ICachedJwks {
  keys: IJwk[];
  fetchedAt: number;
}

/**
 * Verifies OIDC ID token signatures (RS256) using Node's built-in `crypto` module only — no `jose`/
 * `openid-client` dependency. `crypto.createPublicKey({ key: jwk, format: 'jwk' })` (Node 15.12+)
 * converts a JWKS RSA key directly into a usable public key, so JWKS fetch/cache + manual base64url
 * JWT decoding + `crypto.verify` cover the same ground a JOSE library would for this specific need.
 */
@Injectable()
export class OidcTokenValidatorService {
  private readonly logger = new Logger(OidcTokenValidatorService.name);
  private readonly jwksCache = new Map<string, ICachedJwks>();

  async verifyIdToken(idToken: string, jwksUri: string, expectedIssuer: string, expectedAudience: string, expectedNonce?: string): Promise<IOidcVerificationResult> {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed ID token' };
    }
    const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

    let header: { alg?: string; kid?: string };
    let claims: Record<string, unknown>;
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
      claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      return { valid: false, error: 'Malformed ID token' };
    }

    if (header.alg !== 'RS256') {
      return { valid: false, error: `Unsupported ID token signing algorithm '${header.alg}'` };
    }

    const jwk = await this.findKey(jwksUri, header.kid);
    if (!jwk) {
      return { valid: false, error: 'No matching JWKS key found for ID token' };
    }

    try {
      const publicKey = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' } as any);
      const verifier = createVerify('RSA-SHA256');
      verifier.update(`${headerB64}.${payloadB64}`);
      if (!verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'))) {
        return { valid: false, error: 'ID token signature verification failed' };
      }
    } catch {
      return { valid: false, error: 'ID token signature verification failed' };
    }

    const now = Math.floor(Date.now() / 1000);
    const clockSkewSeconds = 120;
    if (typeof claims.exp === 'number' && claims.exp + clockSkewSeconds < now) {
      return { valid: false, error: 'ID token has expired' };
    }
    if (typeof claims.iat === 'number' && claims.iat - clockSkewSeconds > now) {
      return { valid: false, error: 'ID token issued in the future' };
    }
    if (claims.iss !== expectedIssuer) {
      return { valid: false, error: 'ID token issuer mismatch' };
    }
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(expectedAudience)) {
      return { valid: false, error: 'ID token audience mismatch' };
    }
    if (expectedNonce && claims.nonce !== expectedNonce) {
      return { valid: false, error: 'ID token nonce mismatch' };
    }

    return { valid: true, claims };
  }

  private async findKey(jwksUri: string, kid: string | undefined): Promise<IJwk | undefined> {
    let cached = this.jwksCache.get(jwksUri);
    if (!cached || Date.now() - cached.fetchedAt > JWKS_CACHE_TTL_MS) {
      cached = await this.fetchJwks(jwksUri);
    }

    let key = kid ? cached.keys.find((k) => k.kid === kid) : cached.keys[0];
    if (!key && kid) {
      // Key rotation on the IdP side may have invalidated our cache early — force one refetch before giving up.
      cached = await this.fetchJwks(jwksUri);
      key = cached.keys.find((k) => k.kid === kid);
    }
    return key;
  }

  private async fetchJwks(jwksUri: string): Promise<ICachedJwks> {
    try {
      const response = await axios.get(jwksUri, { timeout: SSO_REQUEST_TIMEOUT_MS });
      const keys: IJwk[] = Array.isArray(response.data?.keys) ? response.data.keys : [];
      const cached: ICachedJwks = { keys, fetchedAt: Date.now() };
      this.jwksCache.set(jwksUri, cached);
      return cached;
    } catch (error) {
      this.logger.warn(`Failed to fetch JWKS from '${jwksUri}': ${(error as Error).message}`);
      return { keys: [], fetchedAt: Date.now() };
    }
  }
}
