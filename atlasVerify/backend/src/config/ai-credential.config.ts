import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { IAiCredentialConfig } from './interfaces';

/**
 * AI provider credential encryption-at-rest configuration.
 *
 * Reads the same ATLAS_CREDENTIAL_KEY passphrase already used by
 * marketplace-provider-credentials, exposed here through
 * ConfigurationService instead of a raw process.env read, per this
 * codebase's config architecture rule (no process.env access outside
 * config factory files).
 */
export const aiCredentialConfig = registerAs(
  CONFIG_NAMESPACES.AI_CREDENTIAL,
  (): IAiCredentialConfig => {
    const passphrase = process.env[ENV_KEYS.ATLAS_CREDENTIAL_KEY];
    if (!passphrase) {
      new Logger('AiCredentialConfig').warn(
        'ATLAS_CREDENTIAL_KEY is not set — falling back to an insecure development-only passphrase. Set ATLAS_CREDENTIAL_KEY in production.',
      );
    }

    return {
      encryptionKeyPassphrase: passphrase ?? 'atlas-default-secret-change-me',
      keyLength: 32,
      ivLength: 12,
      authTagLength: 16,
    };
  },
);
