import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { LICENSE_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM encryption for a license's RSA private signing key — the identical recipe every other
 * per-module credential encryptor this session uses (same `ATLAS_CREDENTIAL_KEY` passphrase, same
 * stored format). The private key must be recoverable in plaintext at token-signing time, so it is
 * encrypted rather than hashed; the paired public key is NOT secret and is never passed through here.
 */
@Injectable()
export class LicenseCredentialEncryptor {
  private readonly logger = new Logger(LicenseCredentialEncryptor.name);

  encryptValue(value: string, scopeKey: string): string {
    try {
      const key = this.deriveKey(scopeKey);
      const iv = randomBytes(LICENSE_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(LICENSE_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        LICENSE_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      this.logger.error('License credential encryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('LICENSE_CREDENTIAL_ENCRYPTION_FAILED');
    }
  }

  deriveKey(scopeKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${LICENSE_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${scopeKey}`;
    return scryptSync(passphrase, salt, LICENSE_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
