import { Injectable } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { NotificationProviderCredentialEncryptor } from './notification-provider-credential.encryptor';
import { NotificationProviderCredentialDecryptionException } from '../exceptions/notification-provider-persisted.exceptions';
import { NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS } from '../constants';
import { DecryptedCredentialBag, INotificationProviderCredential } from '../interfaces';

/**
 * Reverses NotificationProviderCredentialEncryptor. Never logs plaintext,
 * never includes the underlying crypto error or field value in a thrown
 * exception — only the scope identifiers needed to locate the record.
 */
@Injectable()
export class NotificationProviderCredentialDecryptor {
  constructor(private readonly encryptor: NotificationProviderCredentialEncryptor) {}

  decryptField(encryptedValue: string, workspaceId: string, providerKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new NotificationProviderCredentialDecryptionException(`${providerKey}:${workspaceId}`);
    }
    const [, ivB64, authTagB64, ciphertextB64] = parts;

    try {
      const key = this.encryptor.deriveKey(workspaceId, providerKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const ciphertext = Buffer.from(ciphertextB64, 'base64');

      const decipher = createDecipheriv(
        NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS.ALGORITHM,
        key,
        iv,
      );
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf8');
    } catch {
      throw new NotificationProviderCredentialDecryptionException(`${providerKey}:${workspaceId}`);
    }
  }

  decryptFields(
    encryptedFields: Record<string, string>,
    workspaceId: string,
    providerKey: string,
  ): DecryptedCredentialBag {
    const decrypted: DecryptedCredentialBag = {};
    for (const [key, value] of Object.entries(encryptedFields)) {
      decrypted[key] = this.decryptField(value, workspaceId, providerKey);
    }
    return decrypted;
  }

  decryptCredential(credential: INotificationProviderCredential): DecryptedCredentialBag {
    return this.decryptFields(
      credential.encryptedFields,
      credential.workspaceId,
      credential.providerKey,
    );
  }
}
