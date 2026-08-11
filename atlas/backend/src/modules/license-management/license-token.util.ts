import { createSign, createVerify, generateKeyPairSync, randomBytes } from 'crypto';
import { LICENSE_KEY_ID_LENGTH_HEX, LICENSE_RSA_KEY_BITS } from './constants';
import { ILicenseOfflineVerificationResult, ILicenseTokenPayload } from './interfaces';

export interface ILicenseKeyPair {
  privateKey: string;
  publicKey: string;
}

/** Per-license RSA keypair — asymmetric signing is what makes genuine OFFLINE verification possible: the verifier only ever needs the (non-secret) public key, never anything that could be used to forge a new token. */
export function generateLicenseKeyPair(): ILicenseKeyPair {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: LICENSE_RSA_KEY_BITS,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

/** Fixed-length hex public lookup identifier — safe to display/log, mirrors `generateApiKey()`'s `keyId`. */
export function generateLicenseKeyId(): string {
  return randomBytes(LICENSE_KEY_ID_LENGTH_HEX / 2).toString('hex');
}

/**
 * Signs a license token (`base64url(header).base64url(payload).base64url(signature)`, RS256) — the
 * same JWT-shaped structure `OidcTokenValidatorService` verifies elsewhere in this codebase, reused
 * here for the opposite direction (ATLAS signs instead of verifies).
 */
export function signLicenseToken(payload: ILicenseTokenPayload, privateKeyPem: string): string {
  const header = { alg: 'RS256', typ: 'ATLAS-LICENSE' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signer = createSign('RSA-SHA256');
  signer.update(`${headerB64}.${payloadB64}`);
  const signatureB64 = signer.sign(privateKeyPem).toString('base64url');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Verifies a license token with ONLY the public key — no database access, no server call. Never
 * throws; returns `{ valid: false, reason }` on any parse/verification/expiry failure. Cannot detect
 * server-side revocation/suspension that happened after this token was issued — that is an inherent
 * limitation of offline verification, not a bug; callers who need real-time revocation awareness
 * should use the online `validateLicense()` path instead.
 */
export function verifyLicenseTokenOffline(token: string, publicKeyPem: string): ILicenseOfflineVerificationResult {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed license token' };
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let payload: ILicenseTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'Malformed license token' };
  }

  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    if (!verifier.verify(publicKeyPem, Buffer.from(signatureB64, 'base64url'))) {
      return { valid: false, reason: 'License token signature is invalid' };
    }
  } catch {
    return { valid: false, reason: 'License token signature is invalid' };
  }

  if (typeof payload.expiresAt === 'number' && payload.expiresAt <= Date.now()) {
    return { valid: false, reason: 'License token has expired', payload };
  }

  return { valid: true, payload };
}
