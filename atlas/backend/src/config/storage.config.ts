import { registerAs } from '@nestjs/config';
import { CONFIG_NAMESPACES, ENV_KEYS, CONFIG_DEFAULTS } from './constants';
import type { IStorageFoundationConfig } from './interfaces';

/**
 * File Management storage foundation configuration — the local base path,
 * size/quota limits, and default expiring-access-token TTL. Concrete
 * storage-provider selection (local filesystem today; S3/GCS/etc. later)
 * stays behind `IStorageProvider` — this only configures the active
 * provider's parameters, never provider-specific credentials (those, if
 * ever needed for a remote provider, belong in the encrypted-credential
 * pattern already established by ai-provider-credentials /
 * notification-provider-credentials, not here).
 */
export const storageConfig = registerAs(
  CONFIG_NAMESPACES.STORAGE,
  (): IStorageFoundationConfig => ({
    basePath: process.env[ENV_KEYS.STORAGE_BASE_PATH] || CONFIG_DEFAULTS.STORAGE_BASE_PATH,
    maxFileSizeBytes: parseInt(
      process.env[ENV_KEYS.STORAGE_MAX_FILE_SIZE_BYTES] ?? String(CONFIG_DEFAULTS.STORAGE_MAX_FILE_SIZE_BYTES),
      10,
    ),
    defaultWorkspaceQuotaBytes: parseInt(
      process.env[ENV_KEYS.STORAGE_DEFAULT_WORKSPACE_QUOTA_BYTES] ??
        String(CONFIG_DEFAULTS.STORAGE_DEFAULT_WORKSPACE_QUOTA_BYTES),
      10,
    ),
    accessTokenDefaultTtlMs: parseInt(
      process.env[ENV_KEYS.STORAGE_ACCESS_TOKEN_DEFAULT_TTL_MS] ??
        String(CONFIG_DEFAULTS.STORAGE_ACCESS_TOKEN_DEFAULT_TTL_MS),
      10,
    ),
  }),
);
