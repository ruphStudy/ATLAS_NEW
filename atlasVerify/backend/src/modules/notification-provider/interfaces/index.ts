export enum NotificationProviderRegistryStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationProviderConfigStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationProviderCredentialStatus {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  REVOKED = 'REVOKED',
}

export enum NotificationProviderPersistedEvent {
  REGISTRY_ENTRY_REGISTERED = 'notification-provider.registry_entry_registered',
  REGISTRY_ENTRY_UPDATED = 'notification-provider.registry_entry_updated',
  REGISTRY_ENTRY_ENABLED = 'notification-provider.registry_entry_enabled',
  REGISTRY_ENTRY_DISABLED = 'notification-provider.registry_entry_disabled',
  REGISTRY_ENTRY_ARCHIVED = 'notification-provider.registry_entry_archived',
  CONFIG_CREATED = 'notification-provider.config_created',
  CONFIG_UPDATED = 'notification-provider.config_updated',
  CONFIG_DELETED = 'notification-provider.config_deleted',
  CREDENTIAL_CREATED = 'notification-provider.credential_created',
  CREDENTIAL_UPDATED = 'notification-provider.credential_updated',
  CREDENTIAL_ROTATED = 'notification-provider.credential_rotated',
  CREDENTIAL_REVOKED = 'notification-provider.credential_revoked',
  CREDENTIAL_VALIDATION_SUCCEEDED = 'notification-provider.credential_validation_succeeded',
  CREDENTIAL_VALIDATION_FAILED = 'notification-provider.credential_validation_failed',
  DELIVERY_QUEUED = 'notification-provider.delivery_queued',
  DELIVERY_SENT = 'notification-provider.delivery_sent',
  DELIVERY_DELIVERED = 'notification-provider.delivery_delivered',
  DELIVERY_READ = 'notification-provider.delivery_read',
  DELIVERY_OPENED = 'notification-provider.delivery_opened',
  DELIVERY_UNDELIVERED = 'notification-provider.delivery_undelivered',
  DELIVERY_REJECTED = 'notification-provider.delivery_rejected',
  DELIVERY_FAILED = 'notification-provider.delivery_failed',
  DELIVERY_CANCELLED = 'notification-provider.delivery_cancelled',
}

// ── Entity interfaces (mirror the Prisma models) ────────────────────

export interface INotificationProviderRegistryEntry {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  channel: string;
  displayName: string;
  version: string;
  status: NotificationProviderRegistryStatus;
  capabilities: string[];
  priority: number;
  isDefault: boolean;
  fallbackOrder: string[];
  metadata: unknown;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface INotificationProviderConfig {
  id: string;
  workspaceId: string;
  providerKey: string;
  channel: string;
  name: string;
  status: NotificationProviderConfigStatus;
  priority: number;
  isFallback: boolean;
  fallbackProviderKeys: string[];
  version: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  settings: unknown;
  timeoutMs?: number | null;
  maxRetryAttempts?: number | null;
  retryBackoffMs?: number | null;
  maxRequestsPerMinute?: number | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface INotificationProviderConfigHistory {
  id: string;
  configId: string;
  workspaceId: string;
  providerKey: string;
  version: number;
  status: string;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface INotificationProviderCredential {
  id: string;
  workspaceId: string;
  providerKey: string;
  channel: string;
  credentialSetName: string;
  description?: string | null;
  status: NotificationProviderCredentialStatus;
  version: number;
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  expiresAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastRotatedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface INotificationProviderCredentialHistory {
  id: string;
  credentialId: string;
  workspaceId: string;
  providerKey: string;
  version: number;
  status: string;
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface INotificationDelivery {
  id: string;
  workspaceId: string;
  notificationId?: string | null;
  channel: string;
  providerKey?: string | null;
  configId?: string | null;
  recipientAddress: string;
  recipientName?: string | null;
  subject?: string | null;
  messagePreview?: string | null;
  templateId?: string | null;
  status: string;
  attemptNumber: number;
  isRetry: boolean;
  isFallback: boolean;
  idempotencyKey?: string | null;
  scheduledAt?: Date | null;
  queuedAt?: Date | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  openedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  providerRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  batchId?: string | null;
  latencyMs?: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export type DecryptedCredentialBag = Record<string, string>;

export interface INotificationProviderPersistedEventPayload {
  event: NotificationProviderPersistedEvent;
  workspaceId: string;
  providerKey?: string;
  registryEntryId?: string;
  configId?: string;
  credentialId?: string;
  deliveryId?: string;
  batchId?: string;
  metadata?: Record<string, unknown>;
}
