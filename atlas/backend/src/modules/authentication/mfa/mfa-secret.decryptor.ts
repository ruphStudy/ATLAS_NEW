import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { MfaSecretEncryptor } from './mfa-secret.encryptor';
import { MFA_CREDENTIAL_CONSTANTS } from './mfa.constants';

/**
 * AES-256-GCM decryption for a user's TOTP secret. Kept separate from
 * encryption so only the component that genuinely needs the plaintext
 * secret (TOTP verification) depends on this class. NEVER log or return
 * the decrypted value in any API response.
 */
@Injectable()
export class MfaSecretDecryptor {
  private readonly logger = new Logger(MfaSecretDecryptor.name);

  constructor(private readonly encryptor: MfaSecretEncryptor) {}

  /** Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64). */
  decryptValue(encryptedValue: string, scopeKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error('MFA_SECRET_DECRYPTION_FAILED: invalid format (expected 4 segments)');
    }

    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(scopeKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(MFA_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('MFA secret decryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('MFA_SECRET_DECRYPTION_FAILED');
    }
  }
}
