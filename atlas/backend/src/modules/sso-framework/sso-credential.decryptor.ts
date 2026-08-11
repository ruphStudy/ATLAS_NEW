import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { SsoCredentialEncryptor } from './sso-credential.encryptor';
import { SSO_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM decryption for IdP certificates and OIDC client secrets. Kept
 * separate from encryption so only the components that genuinely need
 * plaintext (assertion/token validators, at login time) depend on this
 * class. NEVER log or return the decrypted value to a caller/response.
 */
@Injectable()
export class SsoCredentialDecryptor {
  private readonly logger = new Logger(SsoCredentialDecryptor.name);

  constructor(private readonly encryptor: SsoCredentialEncryptor) {}

  /** Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64). */
  decryptValue(encryptedValue: string, scopeKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error('SSO_CREDENTIAL_DECRYPTION_FAILED: invalid format (expected 4 segments)');
    }

    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(scopeKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(SSO_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('SSO credential decryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('SSO_CREDENTIAL_DECRYPTION_FAILED');
    }
  }
}
