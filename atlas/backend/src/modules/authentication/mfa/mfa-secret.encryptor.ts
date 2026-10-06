import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { MFA_CREDENTIAL_CONSTANTS } from './mfa.constants';

/**
 * AES-256-GCM encryption for a user's TOTP secret — same recipe as every
 * other per-module credential encryptor in this codebase (e.g.
 * `AppStoreCredentialEncryptor`). Never logs or returns the raw secret;
 * only the encrypted, colon-delimited `<version>:<iv>:<authTag>:<ciphertext>`
 * form is persisted.
 */
@Injectable()
export class MfaSecretEncryptor {
  private readonly logger = new Logger(MfaSecretEncryptor.name);

  encryptValue(value: string, scopeKey: string): string {
    try {
      const key = this.deriveKey(scopeKey);
      const iv = randomBytes(MFA_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(MFA_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        MFA_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      // Never include `value` (the secret) in the log.
      this.logger.error('MFA secret encryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('MFA_SECRET_ENCRYPTION_FAILED');
    }
  }

  deriveKey(scopeKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${MFA_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${scopeKey}`;
    return scryptSync(passphrase, salt, MFA_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
