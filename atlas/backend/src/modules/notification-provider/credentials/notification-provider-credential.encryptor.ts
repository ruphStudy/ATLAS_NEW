import { Injectable } from '@nestjs/common';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';
import { ConfigurationService } from '@config/configuration.service';
import { NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS } from '../constants';

/**
 * AES-256-GCM field-level encryption for notification-provider credentials,
 * mirroring src/modules/ai-provider-credentials/encryptor exactly. Reuses
 * the same managed passphrase (`ConfigurationService.getAiCredentialConfig()`
 * — already documented in this codebase as "a single managed secret" shared
 * across encryption consumers) but derives a distinct key via its own salt
 * prefix, so a leaked derived key here cannot decrypt AI provider credentials
 * or vice versa.
 */
@Injectable()
export class NotificationProviderCredentialEncryptor {
  constructor(private readonly configurationService: ConfigurationService) {}

  encryptField(value: string, workspaceId: string, providerKey: string): string {
    const config = this.configurationService.getAiCredentialConfig();
    const key = this.deriveKey(workspaceId, providerKey);
    const iv = randomBytes(config.ivLength);

    const cipher = createCipheriv(NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS.ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS.ENCRYPTION_VERSION,
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
    const salt = `${NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS.SALT_PREFIX}-${providerKey.toUpperCase()}-${workspaceId}`;
    return scryptSync(config.encryptionKeyPassphrase, salt, config.keyLength);
  }
}
