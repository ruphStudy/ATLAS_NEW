import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { WEBHOOK_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM encryption for webhook signing secrets — the identical recipe
 * `PaymentCredentialEncryptor`/`MarketplaceCredentialEncryptor` use (same
 * `ATLAS_CREDENTIAL_KEY` passphrase, same stored format). Unlike API key
 * secrets (one-way hashed), a webhook secret must be recoverable in
 * plaintext at delivery time to compute the outgoing HMAC signature, so it
 * is encrypted rather than hashed.
 *
 * Stored format (colon-delimited, all base64): `<version>:<iv>:<authTag>:<ciphertext>`.
 */
@Injectable()
export class WebhookCredentialEncryptor {
  private readonly logger = new Logger(WebhookCredentialEncryptor.name);

  /** Never logs the plain-text secret. */
  encryptSecret(secret: string, scopeKey: string): string {
    try {
      const key = this.deriveKey(scopeKey);
      const iv = randomBytes(WEBHOOK_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(WEBHOOK_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        WEBHOOK_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      this.logger.error('Webhook secret encryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('WEBHOOK_CREDENTIAL_ENCRYPTION_FAILED');
    }
  }

  deriveKey(scopeKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${WEBHOOK_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${scopeKey}`;
    return scryptSync(passphrase, salt, WEBHOOK_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
