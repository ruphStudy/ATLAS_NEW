import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { PaymentCredentialEncryptor } from './payment-credential.encryptor';
import { IDecryptedCredentialBag, IPaymentProviderCredential } from '../interfaces';
import { PAYMENT_CREDENTIAL_CONSTANTS, PAYMENT_CREDENTIAL_ERROR_CODES } from '../constants';

/**
 * Handles AES-256-GCM decryption of payment credential field values.
 * Decryption is intentionally separated from encryption so only the
 * components that genuinely need plain-text (adapters, at request time)
 * depend on this class. NEVER log or expose decrypted values elsewhere.
 */
@Injectable()
export class PaymentCredentialDecryptor {
  private readonly logger = new Logger(PaymentCredentialDecryptor.name);

  constructor(private readonly encryptor: PaymentCredentialEncryptor) {}

  /** Stored format: `<version>:<iv>:<authTag>:<ciphertext>` (all base64). */
  decryptField(encryptedValue: string, workspaceId: string, providerKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new Error(`${PAYMENT_CREDENTIAL_ERROR_CODES.DECRYPTION_FAILED}: invalid format (expected 4 segments)`);
    }

    const [, ivB64, tagB64, dataB64] = parts as [string, string, string, string];

    try {
      const key = this.encryptor.deriveKey(workspaceId, providerKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(tagB64, 'base64');
      const encrypted = Buffer.from(dataB64, 'base64');

      const decipher = createDecipheriv(PAYMENT_CREDENTIAL_CONSTANTS.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (err) {
      this.logger.error('Decryption failed', { workspaceId, providerKey, error: (err as Error).message });
      throw new Error(PAYMENT_CREDENTIAL_ERROR_CODES.DECRYPTION_FAILED);
    }
  }

  /** Returns an ephemeral `IDecryptedCredentialBag` — callers must not persist it. */
  decryptCredential(credential: IPaymentProviderCredential): IDecryptedCredentialBag {
    const fields: Record<string, string> = {};
    for (const [key, encryptedValue] of Object.entries(credential.encryptedFields)) {
      fields[key] = this.decryptField(encryptedValue, credential.workspaceId, credential.providerKey);
    }

    return {
      accountId: credential.accountId,
      workspaceId: credential.workspaceId,
      providerKey: credential.providerKey,
      fields,
    };
  }
}
