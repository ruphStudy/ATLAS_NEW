import {
  NotificationProviderRegistryStatus,
  NotificationProviderConfigStatus,
  NotificationProviderCredentialStatus,
} from '../interfaces';

export const NOTIFICATION_PROVIDER_CREDENTIAL_CONSTANTS = {
  ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_VERSION: 'v1',
  SALT_PREFIX: 'notif-cred',
} as const;

export const NOTIFICATION_PROVIDER_REGISTRY_TRANSITIONS: Record<
  NotificationProviderRegistryStatus,
  NotificationProviderRegistryStatus[]
> = {
  [NotificationProviderRegistryStatus.PENDING]: [
    NotificationProviderRegistryStatus.ACTIVE,
    NotificationProviderRegistryStatus.DISABLED,
    NotificationProviderRegistryStatus.ARCHIVED,
  ],
  [NotificationProviderRegistryStatus.ACTIVE]: [
    NotificationProviderRegistryStatus.DISABLED,
    NotificationProviderRegistryStatus.ARCHIVED,
  ],
  [NotificationProviderRegistryStatus.DISABLED]: [
    NotificationProviderRegistryStatus.ACTIVE,
    NotificationProviderRegistryStatus.ARCHIVED,
  ],
  [NotificationProviderRegistryStatus.ARCHIVED]: [],
};

export const NOTIFICATION_PROVIDER_CONFIG_TRANSITIONS: Record<
  NotificationProviderConfigStatus,
  NotificationProviderConfigStatus[]
> = {
  [NotificationProviderConfigStatus.ACTIVE]: [
    NotificationProviderConfigStatus.DISABLED,
    NotificationProviderConfigStatus.ARCHIVED,
  ],
  [NotificationProviderConfigStatus.DISABLED]: [
    NotificationProviderConfigStatus.ACTIVE,
    NotificationProviderConfigStatus.ARCHIVED,
  ],
  [NotificationProviderConfigStatus.ARCHIVED]: [],
};

export const NOTIFICATION_PROVIDER_CREDENTIAL_TRANSITIONS: Record<
  NotificationProviderCredentialStatus,
  NotificationProviderCredentialStatus[]
> = {
  [NotificationProviderCredentialStatus.PENDING_VALIDATION]: [
    NotificationProviderCredentialStatus.ACTIVE,
    NotificationProviderCredentialStatus.VALIDATION_FAILED,
    NotificationProviderCredentialStatus.DISABLED,
    NotificationProviderCredentialStatus.REVOKED,
  ],
  [NotificationProviderCredentialStatus.ACTIVE]: [
    NotificationProviderCredentialStatus.DISABLED,
    NotificationProviderCredentialStatus.EXPIRED,
    NotificationProviderCredentialStatus.INVALID,
    NotificationProviderCredentialStatus.REVOKED,
  ],
  [NotificationProviderCredentialStatus.DISABLED]: [
    NotificationProviderCredentialStatus.ACTIVE,
    NotificationProviderCredentialStatus.REVOKED,
  ],
  [NotificationProviderCredentialStatus.EXPIRED]: [
    NotificationProviderCredentialStatus.ACTIVE,
    NotificationProviderCredentialStatus.REVOKED,
  ],
  [NotificationProviderCredentialStatus.INVALID]: [
    NotificationProviderCredentialStatus.ACTIVE,
    NotificationProviderCredentialStatus.REVOKED,
  ],
  [NotificationProviderCredentialStatus.VALIDATION_FAILED]: [
    NotificationProviderCredentialStatus.ACTIVE,
    NotificationProviderCredentialStatus.DISABLED,
    NotificationProviderCredentialStatus.REVOKED,
  ],
  [NotificationProviderCredentialStatus.REVOKED]: [],
};
