import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { SSO_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM encryption for IdP certificates and OIDC client secrets — the
 * identical recipe `OAuthCredentialEncryptor`/`WebhookCredentialEncryptor`
 * use (same `ATLAS_CREDENTIAL_KEY` passphrase, same stored format).
 *
 * Stored format (colon-delimited, all base64): `<version>:<iv>:<authTag>:<ciphertext>`.
 */
@Injectable()
export class SsoCredentialEncryptor {
  private readonly logger = new Logger(SsoCredentialEncryptor.name);

  /** Never logs the plain-text value. */
  encryptValue(value: string, scopeKey: string): string {
    try {
      const key = this.deriveKey(scopeKey);
      const iv = randomBytes(SSO_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(SSO_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        SSO_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      this.logger.error('SSO credential encryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('SSO_CREDENTIAL_ENCRYPTION_FAILED');
    }
  }

  deriveKey(scopeKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${SSO_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${scopeKey}`;
    return scryptSync(passphrase, salt, SSO_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
