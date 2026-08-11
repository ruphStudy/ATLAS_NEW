import {
  NotificationProviderRegistryStatus,
  NotificationProviderConfigStatus,
  NotificationProviderCredentialStatus,
} from '../interfaces';

export class RegistryEntryResponseDto {
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
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedRegistryEntryResponseDto {
  data: RegistryEntryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProviderConfigResponseDto {
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
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedProviderConfigResponseDto {
  data: ProviderConfigResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProviderConfigHistoryResponseDto {
  id: string;
  configId: string;
  version: number;
  status: string;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

/**
 * Never includes `encryptedFields` — this is the only shape returned by any
 * controller in this module for credentials, mirroring
 * ai-provider-credentials' response mapper exactly.
 */
export class ProviderCredentialResponseDto {
  id: string;
  workspaceId: string;
  providerKey: string;
  channel: string;
  credentialSetName: string;
  description?: string | null;
  status: NotificationProviderCredentialStatus;
  version: number;
  expiresAt?: Date | null;
  lastValidatedAt?: Date | null;
  lastRotatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static from(raw: Record<string, unknown>): ProviderCredentialResponseDto {
    const dto = new ProviderCredentialResponseDto();
    Object.assign(dto, {
      id: raw.id,
      workspaceId: raw.workspaceId,
      providerKey: raw.providerKey,
      channel: raw.channel,
      credentialSetName: raw.credentialSetName,
      description: raw.description,
      status: raw.status,
      version: raw.version,
      expiresAt: raw.expiresAt,
      lastValidatedAt: raw.lastValidatedAt,
      lastRotatedAt: raw.lastRotatedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
    return dto;
  }
}

export class PaginatedProviderCredentialResponseDto {
  data: ProviderCredentialResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProviderCredentialHistoryResponseDto {
  id: string;
  credentialId: string;
  version: number;
  status: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;

  static from(raw: Record<string, unknown>): ProviderCredentialHistoryResponseDto {
    const dto = new ProviderCredentialHistoryResponseDto();
    Object.assign(dto, {
      id: raw.id,
      credentialId: raw.credentialId,
      version: raw.version,
      status: raw.status,
      changeReason: raw.changeReason,
      changedBy: raw.changedBy,
      createdAt: raw.createdAt,
      // encryptedFields deliberately omitted
    });
    return dto;
  }
}

export class ConnectionValidationResponseDto {
  valid: boolean;
  checkedAt: Date;
  message?: string;
  latencyMs?: number;
}

export class DeliveryResponseDto {
  id: string;
  workspaceId: string;
  notificationId?: string | null;
  channel: string;
  providerKey?: string | null;
  recipientAddress: string;
  recipientName?: string | null;
  subject?: string | null;
  status: string;
  attemptNumber: number;
  isRetry: boolean;
  isFallback: boolean;
  idempotencyKey?: string | null;
  scheduledAt?: Date | null;
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
  createdAt: Date;
}

export class PaginatedDeliveryResponseDto {
  data: DeliveryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SendNotificationResponseDto {
  batchId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveryIds: string[];
}
