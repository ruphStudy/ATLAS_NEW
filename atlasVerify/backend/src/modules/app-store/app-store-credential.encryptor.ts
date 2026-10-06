import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { APP_STORE_CREDENTIAL_CONSTANTS } from './constants';

/**
 * AES-256-GCM encryption for an app installation's credential references — the identical recipe every
 * other per-module credential encryptor this session uses (same `ATLAS_CREDENTIAL_KEY` passphrase,
 * same stored format). Never returned in any response DTO; decrypted only by whatever the app's own
 * runtime (outside this module) needs it for.
 */
@Injectable()
export class AppStoreCredentialEncryptor {
  private readonly logger = new Logger(AppStoreCredentialEncryptor.name);

  encryptValue(value: string, scopeKey: string): string {
    try {
      const key = this.deriveKey(scopeKey);
      const iv = randomBytes(APP_STORE_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(APP_STORE_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        APP_STORE_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      this.logger.error('App store credential encryption failed', { scopeKey, error: (err as Error).message });
      throw new Error('APP_STORE_CREDENTIAL_ENCRYPTION_FAILED');
    }
  }

  deriveKey(scopeKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${APP_STORE_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${scopeKey}`;
    return scryptSync(passphrase, salt, APP_STORE_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
