import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { PAYMENT_CREDENTIAL_CONSTANTS, PAYMENT_CREDENTIAL_ERROR_CODES } from '../constants';

/**
 * Handles AES-256-GCM encryption of payment credential field values —
 * the identical recipe `MarketplaceCredentialEncryptor` uses (same
 * `ATLAS_CREDENTIAL_KEY` passphrase, same stored format), so payment
 * secrets get the same at-rest guarantee without a second encryption
 * scheme for the same class of data.
 *
 * Each field is encrypted independently so a single value can be rotated
 * without re-encrypting the whole credential record.
 *
 * Stored format (colon-delimited, all base64):
 *   `<encryptionVersion>:<iv>:<authTag>:<ciphertext>`
 */
@Injectable()
export class PaymentCredentialEncryptor {
  private readonly logger = new Logger(PaymentCredentialEncryptor.name);

  /** Encrypts a single field value. Never logs the plain-text value. */
  encryptField(value: string, workspaceId: string, providerKey: string): string {
    try {
      const key = this.deriveKey(workspaceId, providerKey);
      const iv = randomBytes(PAYMENT_CREDENTIAL_CONSTANTS.IV_LENGTH);
      const cipher = createCipheriv(PAYMENT_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);

      const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return [
        PAYMENT_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    } catch (err) {
      this.logger.error('Encryption failed', { workspaceId, providerKey, error: (err as Error).message });
      throw new Error(PAYMENT_CREDENTIAL_ERROR_CODES.ENCRYPTION_FAILED);
    }
  }

  /** Encrypts all fields in a raw plain-text map — this is the boundary where plaintext enters. */
  encryptFields(fields: Record<string, string>, workspaceId: string, providerKey: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      result[key] = this.encryptField(value, workspaceId, providerKey);
    }
    return result;
  }

  /** Returns a masked representation safe for logging — always `***MASKED***` regardless of field type. */
  maskFields(fields: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      masked[key] = PAYMENT_CREDENTIAL_CONSTANTS.MASK_VALUE;
    }
    return masked;
  }

  deriveKey(workspaceId: string, providerKey: string): Buffer {
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${PAYMENT_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${providerKey.toUpperCase()}-${workspaceId}`;
    return scryptSync(passphrase, salt, PAYMENT_CREDENTIAL_CONSTANTS.KEY_LENGTH) as Buffer;
  }
}
