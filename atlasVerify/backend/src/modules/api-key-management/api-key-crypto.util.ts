import { createHash, randomBytes } from 'crypto';
import { API_KEY_HASH_ALGORITHM, API_KEY_ID_LENGTH_HEX, API_KEY_PREFIX, API_KEY_SECRET_BYTES } from './constants';

export interface IGeneratedApiKey {
  keyId: string;
  secret: string;
  secretHash: string;
  plaintextKey: string;
}

/**
 * Generates a new key id + secret pair. `keyId` is a fixed-length hex
 * string (safe to display/log — it's just a lookup handle, not a secret)
 * used as the indexed DB lookup column; `secret` is the high-entropy part
 * that gets hashed and is never stored or logged in plaintext. Because
 * `keyId`'s charset (hex) can never contain the `_` separator, parsing a
 * presented key back apart is unambiguous regardless of what characters
 * appear in the base64url-encoded secret.
 */
export function generateApiKey(): IGeneratedApiKey {
  const keyId = randomBytes(API_KEY_ID_LENGTH_HEX / 2).toString('hex');
  const secret = randomBytes(API_KEY_SECRET_BYTES).toString('base64url');
  const secretHash = hashApiKeySecret(secret);
  const plaintextKey = `${API_KEY_PREFIX}${keyId}_${secret}`;
  return { keyId, secret, secretHash, plaintextKey };
}

/**
 * API secrets are high-entropy, randomly generated (never user-chosen), so
 * an unsalted fast hash is the correct, industry-standard choice here —
 * unlike user passwords, which require a slow, salted hash. This lets
 * validation look the key up directly by `secretHash` instead of iterating
 * every stored key to compare against a per-record salt.
 */
export function hashApiKeySecret(secret: string): string {
  return createHash(API_KEY_HASH_ALGORITHM).update(secret).digest('hex');
}

export interface IParsedApiKey {
  keyId: string;
  secret: string;
}

/** Returns `null` for anything that doesn't match this module's key format — never throws on malformed input. */
export function parseApiKey(rawKey: string): IParsedApiKey | null {
  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }
  const remainder = rawKey.slice(API_KEY_PREFIX.length);
  if (remainder.length <= API_KEY_ID_LENGTH_HEX + 1 || remainder[API_KEY_ID_LENGTH_HEX] !== '_') {
    return null;
  }

  const keyId = remainder.slice(0, API_KEY_ID_LENGTH_HEX);
  const secret = remainder.slice(API_KEY_ID_LENGTH_HEX + 1);
  if (!/^[0-9a-f]+$/.test(keyId) || secret.length === 0) {
    return null;
  }

  return { keyId, secret };
}
