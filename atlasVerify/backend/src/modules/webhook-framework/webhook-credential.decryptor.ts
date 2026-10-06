import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { WebhookCredentialEncryptor } from './webhook-credential.encryptor';
import { WEBHOOK_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM decryption for webhook signing secrets. Decryption is kept
 * separate from encryption so only the component that genuinely needs
 * plaintext (the delivery worker, at send time) depends on this class.
 * NEVER log or return the decrypted value to a caller/response.
 */
@Injectable()
export class WebhookCredentialDecryptor {
  private readonly logger = new Logger(WebhookCredentialDecryptor.name);

  constructor(private readonly encryptor: WebhookCredentialEncryptor) {}

  /** Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64). */
  decryptSecret(encryptedValue: string, scopeKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error('WEBHOOK_CREDENTIAL_DECRYPTION_FAILED: invalid format (expected 4 segments)');
    }

    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(scopeKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(WEBHOOK_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('Webhook secret decryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('WEBHOOK_CREDENTIAL_DECRYPTION_FAILED');
    }
  }
}
