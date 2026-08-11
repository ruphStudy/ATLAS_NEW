import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { MarketplaceCredentialEncryptor } from '../encryptor/marketplace-credential.encryptor';
import { DecryptedCredentialBag, IMarketplaceProviderCredential } from '../interfaces';
import { MP_CREDENTIAL_CONSTANTS, MP_CREDENTIAL_ERROR_CODES } from '../constants';

/**
 * Handles AES-256-GCM decryption of credential field values.
 *
 * Decryption is intentionally separated from encryption so that
 * only components that explicitly need plain-text depend on this class.
 *
 * NEVER log or expose the decrypted values outside this class.
 */
@Injectable()
export class MarketplaceCredentialDecryptor {
  private readonly logger = new Logger(MarketplaceCredentialDecryptor.name);

  constructor(private readonly encryptor: MarketplaceCredentialEncryptor) {}

  /**
   * Decrypts a single stored field value.
   * Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64).
   */
  decryptField(
    encryptedValue: string,
    workspaceId: string,
    providerKey: string,
  ): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error(
        `${MP_CREDENTIAL_ERROR_CODES.DECRYPTION_FAILED}: invalid format (expected 4 segments)`,
      );
    }

    // parts[0] is the encryption version — reserved for future algorithm switching
    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(workspaceId, providerKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(
        MP_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM,
        key,
        iv,
      );
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('Decryption failed', { workspaceId, providerKey, error: (err as Error).message });
      throw new Error(MP_CREDENTIAL_ERROR_CODES.DECRYPTION_FAILED);
    }
  }

  /**
   * Decrypts all fields in a stored credential record.
   * Returns an ephemeral DecryptedCredentialBag — callers must not persist it.
   */
  decryptCredential(credential: IMarketplaceProviderCredential): DecryptedCredentialBag {
    const fields: Record<string, string> = {};

    for (const [key, encryptedValue] of Object.entries(credential.encryptedFields)) {
      fields[key] = this.decryptField(
        encryptedValue,
        credential.workspaceId,
        credential.providerKey,
      );
    }

    return {
      credentialId: credential.id,
      workspaceId: credential.workspaceId,
      providerKey: credential.providerKey,
      fields,
    };
  }

  /**
   * Decrypts only the specified keys from a credential's encrypted fields.
   * Use this to minimise the exposure surface of decrypted secrets.
   */
  decryptFields(
    encryptedFields: Record<string, string>,
    keys: string[],
    workspaceId: string,
    providerKey: string,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      if (encryptedFields[key]) {
        result[key] = this.decryptField(encryptedFields[key], workspaceId, providerKey);
      }
    }
    return result;
  }
}
