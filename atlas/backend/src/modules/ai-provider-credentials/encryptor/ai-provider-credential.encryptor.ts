import { Injectable } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { ConfigurationService } from '../../../config/configuration.service';
import { AI_CREDENTIAL_CONSTANTS } from '../constants';

/**
 * AiProviderCredentialEncryptor
 *
 * AES-256-GCM field-level encryption, mirroring the existing
 * `marketplace-provider-credentials` encryptor's algorithm and on-disk
 * format (`<encVersion>:<iv>:<authTag>:<ciphertext>`, all base64), but
 * sourcing its key passphrase through `ConfigurationService` instead of a
 * raw `process.env` read.
 *
 * The derived key is scoped per (workspace, provider) pair — never a
 * single global key — so a leaked key for one workspace/provider does not
 * expose credentials belonging to another.
 */
@Injectable()
export class AiProviderCredentialEncryptor {
  constructor(private readonly configurationService: ConfigurationService) {}

  encryptField(value: string, workspaceId: string, providerKey: string): string {
    const config = this.configurationService.getAiCredentialConfig();
    const key = this.deriveKey(workspaceId, providerKey);
    const iv = randomBytes(config.ivLength);

    const cipher = createCipheriv(AI_CREDENTIAL_CONSTANTS.ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      AI_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  encryptFields(
    fields: Record<string, string>,
    workspaceId: string,
    providerKey: string,
  ): Record<string, string> {
    const encrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      encrypted[key] = this.encryptField(value, workspaceId, providerKey);
    }
    return encrypted;
  }

  /** Always returns a fixed mask — never reveals length or content. */
  maskFields(fields: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
      masked[key] = '***MASKED***';
    }
    return masked;
  }

  deriveKey(workspaceId: string, providerKey: string): Buffer {
    const config = this.configurationService.getAiCredentialConfig();
    const salt = `${AI_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${providerKey.toUpperCase()}-${workspaceId}`;
    return scryptSync(config.encryptionKeyPassphrase, salt, config.keyLength);
  }
}
