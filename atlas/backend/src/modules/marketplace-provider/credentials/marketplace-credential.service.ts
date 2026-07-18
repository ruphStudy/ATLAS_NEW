import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import {
  MarketplaceCredentialEncryption,
  MarketplaceCredentials,
  MarketplaceCredentialValidationResult,
} from '../interfaces';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT_PREFIX = 'atlas-marketplace';

/**
 * Manages encryption, decryption, and validation of marketplace provider credentials.
 * Never logs or exposes raw credential values.
 * In production, replace `deriveKey()` with a KMS call (AWS KMS, HashiCorp Vault, etc.).
 */
@Injectable()
export class MarketplaceCredentialService {
  private readonly logger = new Logger(MarketplaceCredentialService.name);

  /**
   * Encrypts a single credential field value using AES-256-GCM.
   * Returns a colon-delimited string: iv:authTag:ciphertext (all base64).
   */
  encrypt(value: string, workspaceId: string, providerKey: string): string {
    const key = this.deriveKey(workspaceId, providerKey);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
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

  /**
   * Encrypts all fields in a raw credential map.
   */
  encryptFields(
    raw: Record<string, string>,
    workspaceId: string,
    providerKey: string,
  ): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      encrypted[key] = this.encrypt(value, workspaceId, providerKey);
    }
    return encrypted;
  }

  /**
   * Decrypts all fields in a stored credentials object.
   * Returns plain-text fields — caller is responsible for secure handling.
   */
  decryptCredentials(credentials: MarketplaceCredentials): Record<string, string> {
    if (credentials.encryptionAlgorithm === MarketplaceCredentialEncryption.NONE) {
      return { ...credentials.fields };
    }
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials.fields)) {
      decrypted[key] = this.decrypt(value, credentials.workspaceId, credentials.providerKey);
    }
    return decrypted;
  }

  /**
   * Validates that all required fields are present and non-empty.
   */
  validateRequiredFields(
    fields: Record<string, string>,
    requiredKeys: string[],
  ): { valid: boolean; missing: string[] } {
    const missing = requiredKeys.filter((k) => !fields[k] || fields[k].trim() === '');
    return { valid: missing.length === 0, missing };
  }

  /**
   * Full credential validation — checks presence, expiry, and format.
   */
  validateCredentials(
    credentials: MarketplaceCredentials,
    requiredKeys: string[],
  ): MarketplaceCredentialValidationResult {
    const errors: string[] = [];

    const expired =
      !!credentials.expiresAt && credentials.expiresAt < new Date();
    if (expired) {
      errors.push('Credentials have expired');
    }

    let decrypted: Record<string, string> = {};
    try {
      decrypted = this.decryptCredentials(credentials);
    } catch {
      errors.push('Failed to decrypt credentials');
      return { valid: false, missing: requiredKeys, expired, errors };
    }

    const { valid, missing } = this.validateRequiredFields(decrypted, requiredKeys);
    if (!valid) {
      errors.push(`Missing required fields: ${missing.join(', ')}`);
    }

    return { valid: valid && !expired && errors.length === 0, missing, expired, errors };
  }

  /**
   * Checks if credentials are approaching expiry (within the given window).
   */
  isApproachingExpiry(credentials: MarketplaceCredentials, windowMs = 3_600_000): boolean {
    if (!credentials.expiresAt) return false;
    return credentials.expiresAt.getTime() - Date.now() < windowMs;
  }

  /**
   * Masks sensitive credential fields for safe logging.
   * Never call with decrypted values if they contain secrets.
   */
  maskForLog(fields: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      masked[key] = '***MASKED***';
    }
    return masked;
  }

  // ── Internals ────────────────────────────────────────────────

  private deriveKey(workspaceId: string, providerKey: string): Buffer {
    // Deterministic per-workspace-per-provider key derivation.
    // In production: call KMS.getDataKey() instead.
    const passphrase = process.env['ATLAS_CREDENTIAL_KEY'] ?? 'atlas-default-secret-change-me';
    const salt = `${SALT_PREFIX}-${providerKey.toUpperCase()}-${workspaceId}`;
    return scryptSync(passphrase, salt, KEY_LENGTH) as Buffer;
  }
}
