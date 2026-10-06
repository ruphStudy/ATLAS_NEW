import { Injectable } from '@nestjs/common';
import { createDecipheriv } from 'crypto';
import { AiProviderCredentialEncryptor } from '../encryptor/ai-provider-credential.encryptor';
import { AiProviderCredentialDecryptionException } from '../exceptions/ai-provider-credential.exceptions';
import { AI_CREDENTIAL_CONSTANTS } from '../constants';
import { DecryptedCredentialBag, IAiProviderCredentialEntity } from '../interfaces';

/**
 * AiProviderCredentialDecryptor
 *
 * Reverses `AiProviderCredentialEncryptor`. Never logs plaintext, never
 * includes the underlying crypto error or field value in a thrown
 * exception — only the scope identifiers needed to locate the record.
 */
@Injectable()
export class AiProviderCredentialDecryptor {
  constructor(private readonly encryptor: AiProviderCredentialEncryptor) {}

  decryptField(encryptedValue: string, workspaceId: string, providerKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 4) {
      throw new AiProviderCredentialDecryptionException(`${providerKey}:${workspaceId}`);
    }
    const [, ivB64, authTagB64, ciphertextB64] = parts;

    try {
      const key = this.encryptor.deriveKey(workspaceId, providerKey);
      const iv = Buffer.from(ivB64, 'base64');
      const authTag = Buffer.from(authTagB64, 'base64');
      const ciphertext = Buffer.from(ciphertextB64, 'base64');

      const decipher = createDecipheriv(AI_CREDENTIAL_CONSTANTS.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return plaintext.toString('utf8');
    } catch {
      throw new AiProviderCredentialDecryptionException(`${providerKey}:${workspaceId}`);
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

  decryptCredential(credential: IAiProviderCredentialEntity): DecryptedCredentialBag {
    return this.decryptFields(credential.encryptedFields, credential.workspaceId, credential.providerKey);
  }
}
