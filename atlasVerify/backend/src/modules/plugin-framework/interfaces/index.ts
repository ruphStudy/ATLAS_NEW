export enum PluginManifestStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
}

export enum PluginActivationStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  QUARANTINED = 'QUARANTINED',
}

export enum PluginExtensionPointStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum PluginSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum PluginHistoryEntityType {
  MANIFEST = 'MANIFEST',
  ACTIVATION = 'ACTIVATION',
  EXTENSION_POINT = 'EXTENSION_POINT',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum PluginChangeType {
  MANIFEST_REGISTERED = 'MANIFEST_REGISTERED',
  MANIFEST_UPDATED = 'MANIFEST_UPDATED',
  MANIFEST_DEPRECATED = 'MANIFEST_DEPRECATED',
  ACTIVATED = 'ACTIVATED',
  DEACTIVATED = 'DEACTIVATED',
  QUARANTINED = 'QUARANTINED',
  REACTIVATED = 'REACTIVATED',
  EXTENSION_POINT_REGISTERED = 'EXTENSION_POINT_REGISTERED',
  EXTENSION_POINT_REMOVED = 'EXTENSION_POINT_REMOVED',
  SUBSCRIBED = 'SUBSCRIBED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

export enum PluginFrameworkEvent {
  MANIFEST_REGISTERED = 'plugin-framework.manifest_registered',
  MANIFEST_UPDATED = 'plugin-framework.manifest_updated',
  MANIFEST_DEPRECATED = 'plugin-framework.manifest_deprecated',
  ACTIVATED = 'plugin-framework.activated',
  DEACTIVATED = 'plugin-framework.deactivated',
  QUARANTINED = 'plugin-framework.quarantined',
  REACTIVATED = 'plugin-framework.reactivated',
  EXTENSION_POINT_REGISTERED = 'plugin-framework.extension_point_registered',
  EXTENSION_POINT_REMOVED = 'plugin-framework.extension_point_removed',
  SUBSCRIBED = 'plugin-framework.subscribed',
  UNSUBSCRIBED = 'plugin-framework.unsubscribed',
}

export interface IPluginManifest {
  id: string;
  appKey: string;
  versionId: string;
  capabilities: string[];
  requiredPermissions: string[];
  requiredScopes: string[];
  hooks: string[];
  configSchema: unknown;
  minAtlasVersion: string | null;
  maxAtlasVersion: string | null;
  status: PluginManifestStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPluginActivation {
  id: string;
  manifestId: string;
  appKey: string;
  installationId: string;
  workspaceId: string;
  status: PluginActivationStatus;
  grantedPermissions: string[];
  consecutiveFailures: number;
  lastInvokedAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  quarantinedAt: Date | null;
  quarantinedReason: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPluginExtensionPoint {
  id: string;
  appKey: string;
  extensionPointKey: string;
  hookName: string;
  config: unknown;
  status: PluginExtensionPointStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPluginEventSubscription {
  id: string;
  appKey: string;
  workspaceId: string;
  eventName: string;
  targetHook: string;
  status: PluginSubscriptionStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPluginHistory {
  id: string;
  entityType: PluginHistoryEntityType;
  entityId: string;
  appKey: string;
  workspaceId: string | null;
  changeType: PluginChangeType;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IPluginFrameworkEventPayload {
  event: PluginFrameworkEvent;
  appKey: string;
  entityId?: string;
  workspaceId?: string | null;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
