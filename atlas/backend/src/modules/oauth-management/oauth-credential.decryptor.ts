import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { OAuthCredentialEncryptor } from './oauth-credential.encryptor';
import { OAUTH_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM decryption for OAuth client secrets and token references.
 * Kept separate from encryption so only the components that genuinely need
 * plaintext (token exchange/refresh, at request time) depend on this class.
 * NEVER log or return the decrypted value to a caller/response.
 */
@Injectable()
export class OAuthCredentialDecryptor {
  private readonly logger = new Logger(OAuthCredentialDecryptor.name);

  constructor(private readonly encryptor: OAuthCredentialEncryptor) {}

  /** Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64). */
  decryptValue(encryptedValue: string, scopeKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error('OAUTH_CREDENTIAL_DECRYPTION_FAILED: invalid format (expected 4 segments)');
    }

    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(scopeKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(OAUTH_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('OAuth credential decryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('OAUTH_CREDENTIAL_DECRYPTION_FAILED');
    }
  }
}
