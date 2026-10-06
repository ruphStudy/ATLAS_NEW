import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { ShippingCredentialEncryption, ShippingProviderCredentials } from '../interfaces';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

@Injectable()
export class ShippingProviderCredentialService {
  private readonly logger = new Logger(ShippingProviderCredentialService.name);

  /**
   * Encrypts a single credential field value with AES-256-GCM.
   * The encryption key is derived from the workspace + provider combination.
   * In production, use a KMS (AWS KMS, Vault, etc.) instead.
   */
  encrypt(value: string, workspaceId: string, providerKey: string): string {
    const key = this.deriveKey(workspaceId, providerKey);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  /**
   * Decrypts a field value encrypted with `encrypt()`.
   */
  decrypt(encryptedValue: string, workspaceId: string, providerKey: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credential format');
    }
    const [ivB64, tagB64, dataB64] = parts as [string, string, string];
    const key = this.deriveKey(workspaceId, providerKey);
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }

  encryptCredentials(raw: Record<string, string>, workspaceId: string, providerKey: string): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      encrypted[key] = this.encrypt(value, workspaceId, providerKey);
    }
    return encrypted;
  }

  decryptCredentials(credentials: ShippingProviderCredentials): Record<string, string> {
    if (credentials.encryptionAlgorithm === ShippingCredentialEncryption.NONE) {
      return { ...credentials.fields };
    }
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials.fields)) {
      decrypted[key] = this.decrypt(value, credentials.workspaceId, credentials.providerKey);
    }
    return decrypted;
  }

  validateRequiredFields(fields: Record<string, string>, requiredKeys: string[]): { valid: boolean; missing: string[] } {
    const missing = requiredKeys.filter((k) => !fields[k] || fields[k].trim() === '');
    return { valid: missing.length === 0, missing };
  }

  private deriveKey(workspaceId: string, providerKey: string): Buffer {
    const salt = `atlas-shipping-${providerKey}-${workspaceId}`;
    const passphrase = process.env['SHIPPING_CREDENTIAL_SECRET'] ?? 'atlas-dev-secret-32bytes!!';
    return scryptSync(passphrase, salt, KEY_LENGTH) as Buffer;
  }
}
