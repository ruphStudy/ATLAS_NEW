import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { OAUTH_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM encryption for OAuth client secrets and access/refresh token
 * references — the identical recipe `WebhookCredentialEncryptor`/
 * `PaymentCredentialEncryptor` use (same `ATLAS_CREDENTIAL_KEY` passphrase,
 * same stored format). Values must be recoverable in plaintext at token-
 * exchange/refresh time, so they are encrypted rather than hashed.
 *
 * Stored format (colon-delimited, all base64): `<version>:<iv>:<authTag>:<ciphertext>`.
 */
@Injectable()
export class OAuthCredentialEncryptor {
  private readonly logger = new Logger(OAuthCredentialEncryptor.name);

  /** Never logs the plain-text value. */
  encryptValue(value: string, scopeKey: string): string {
    try {
      const key = this.deriveKey(scopeKey);
      const iv = randomBytes(OAUTH_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(OAUTH_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        OAUTH_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      this.logger.error('OAuth credential encryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('OAUTH_CREDENTIAL_ENCRYPTION_FAILED');
    }
  }

  deriveKey(scopeKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${OAUTH_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${scopeKey}`;
    return scryptSync(passphrase, salt, OAUTH_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
