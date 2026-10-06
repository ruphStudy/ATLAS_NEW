import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { AppStoreCredentialEncryptor } from './app-store-credential.encryptor';
import { APP_STORE_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM decryption for an app installation's credential references. Kept separate from
 * encryption so only the component that genuinely needs plaintext depends on this class. NEVER log or
 * return the decrypted value in any API response — "Never expose app credentials or tenant-sensitive
 * configuration."
 */
@Injectable()
export class AppStoreCredentialDecryptor {
  private readonly logger = new Logger(AppStoreCredentialDecryptor.name);

  constructor(private readonly encryptor: AppStoreCredentialEncryptor) {}

  /** Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64). */
  decryptValue(encryptedValue: string, scopeKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error('APP_STORE_CREDENTIAL_DECRYPTION_FAILED: invalid format (expected 4 segments)');
    }

    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(scopeKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(APP_STORE_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('App store credential decryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('APP_STORE_CREDENTIAL_DECRYPTION_FAILED');
    }
  }
}
