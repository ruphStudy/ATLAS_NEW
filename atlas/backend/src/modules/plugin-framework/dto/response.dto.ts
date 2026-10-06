import { PluginActivationStatus, PluginExtensionPointStatus, PluginManifestStatus, PluginSubscriptionStatus } from '../interfaces';

export class PluginManifestResponseDto {
  id!: string;
  appKey!: string;
  versionId!: string;
  capabilities!: string[];
  requiredPermissions!: string[];
  requiredScopes!: string[];
  hooks!: string[];
  configSchema: unknown;
  minAtlasVersion!: string | null;
  maxAtlasVersion!: string | null;
  status!: PluginManifestStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PluginActivationResponseDto {
  id!: string;
  manifestId!: string;
  appKey!: string;
  installationId!: string;
  workspaceId!: string;
  status!: PluginActivationStatus;
  grantedPermissions!: string[];
  consecutiveFailures!: number;
  lastInvokedAt!: Date | null;
  lastErrorAt!: Date | null;
  lastErrorMessage!: string | null;
  quarantinedAt!: Date | null;
  quarantinedReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedPluginActivationResponseDto {
  data!: PluginActivationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PluginExtensionPointResponseDto {
  id!: string;
  appKey!: string;
  extensionPointKey!: string;
  hookName!: string;
  config: unknown;
  status!: PluginExtensionPointStatus;
  createdAt!: Date;
}

export class PluginEventSubscriptionResponseDto {
  id!: string;
  appKey!: string;
  workspaceId!: string;
  eventName!: string;
  targetHook!: string;
  status!: PluginSubscriptionStatus;
  createdAt!: Date;
}

export class PluginHistoryResponseDto {
  id!: string;
  entityType!: string;
  entityId!: string;
  changeType!: string;
  fromStatus!: string | null;
  toStatus!: string | null;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;
}

export class PluginActivationHealthResponseDto {
  activationId!: string;
  appKey!: string;
  status!: PluginActivationStatus;
  consecutiveFailures!: number;
  lastInvokedAt!: Date | null;
  lastErrorAt!: Date | null;
  lastErrorMessage!: string | null;
  quarantinedAt!: Date | null;
  quarantinedReason!: string | null;
}
