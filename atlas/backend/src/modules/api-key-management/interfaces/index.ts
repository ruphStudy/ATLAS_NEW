export enum ApiKeyScopeType {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  USER = 'USER',
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
}

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum ApiKeyChangeType {
  CREATED = 'CREATED',
  ROTATED = 'ROTATED',
  REVOKED = 'REVOKED',
  DISABLED = 'DISABLED',
  ENABLED = 'ENABLED',
  EXPIRED = 'EXPIRED',
}

export enum ApiKeyManagementEvent {
  API_KEY_CREATED = 'api-key-management.api_key_created',
  API_KEY_ROTATED = 'api-key-management.api_key_rotated',
  API_KEY_REVOKED = 'api-key-management.api_key_revoked',
  API_KEY_DISABLED = 'api-key-management.api_key_disabled',
  API_KEY_ENABLED = 'api-key-management.api_key_enabled',
  API_KEY_EXPIRED = 'api-key-management.api_key_expired',
  API_KEY_USED = 'api-key-management.api_key_used',
}

export interface IApiKey {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: ApiKeyScopeType;
  scopeKey: string;
  name: string;
  description: string | null;
  ownerUserId: string | null;
  serviceAccountHandle: string | null;
  keyId: string;
  secretHash: string;
  status: ApiKeyStatus;
  scopes: string[];
  permissions: string[];
  environments: string[];
  ipAllowlist: string[];
  rateLimitPerMinute: number | null;
  usageRestrictions: Record<string, unknown> | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  lastUsedIp: string | null;
  lastUsedMetadata: Record<string, unknown> | null;
  rotatedFromId: string | null;
  rotatedToId: string | null;
  gracePeriodEndsAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  disabledAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKeyHistory {
  id: string;
  apiKeyId: string;
  workspaceId: string | null;
  changeType: ApiKeyChangeType;
  fromStatus: ApiKeyStatus | null;
  toStatus: ApiKeyStatus | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Returned once, at creation/rotation time only — never persisted, never returned again. */
export interface IApiKeyCreatedSecret {
  apiKey: IApiKey;
  /** The full presented key (`prefix + keyId + secret`) — show this to the caller exactly once. */
  plaintextKey: string;
}

export interface IApiKeyValidationContext {
  ipAddress?: string;
  requiredPermission?: string;
  requiredScope?: string;
  environment?: string;
  requestMetadata?: Record<string, unknown>;
}

export interface IApiKeyValidationResult {
  valid: boolean;
  reason?: string;
  apiKey?: IApiKey;
  workspaceId?: string;
  organizationId?: string;
}

export interface IApiKeyManagementEventPayload {
  event: ApiKeyManagementEvent;
  apiKeyId: string;
  workspaceId?: string | null;
  scopeKey: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
