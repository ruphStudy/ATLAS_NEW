export enum OAuthScopeType {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  USER = 'USER',
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
}

export enum OAuthGrantType {
  AUTHORIZATION_CODE = 'AUTHORIZATION_CODE',
  CLIENT_CREDENTIALS = 'CLIENT_CREDENTIALS',
}

export enum OAuthClientStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  REVOKED = 'REVOKED',
  ARCHIVED = 'ARCHIVED',
}

export enum OAuthConnectionStatus {
  CONNECTED = 'CONNECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  DISCONNECTED = 'DISCONNECTED',
}

export enum OAuthAuthorizationRequestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum OAuthHistoryEntityType {
  CLIENT = 'CLIENT',
  CONNECTION = 'CONNECTION',
}

export enum OAuthChangeType {
  CLIENT_REGISTERED = 'CLIENT_REGISTERED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',
  CLIENT_ENABLED = 'CLIENT_ENABLED',
  CLIENT_DISABLED = 'CLIENT_DISABLED',
  CLIENT_SECRET_ROTATED = 'CLIENT_SECRET_ROTATED',
  CLIENT_REVOKED = 'CLIENT_REVOKED',
  CLIENT_ARCHIVED = 'CLIENT_ARCHIVED',
  CONNECTION_AUTHORIZED = 'CONNECTION_AUTHORIZED',
  CONNECTION_REFRESHED = 'CONNECTION_REFRESHED',
  CONNECTION_REVOKED = 'CONNECTION_REVOKED',
  CONNECTION_DISCONNECTED = 'CONNECTION_DISCONNECTED',
  CONNECTION_EXPIRED = 'CONNECTION_EXPIRED',
}

export enum OAuthManagementEvent {
  OAUTH_CLIENT_REGISTERED = 'oauth-management.client_registered',
  OAUTH_CLIENT_UPDATED = 'oauth-management.client_updated',
  OAUTH_CLIENT_ENABLED = 'oauth-management.client_enabled',
  OAUTH_CLIENT_DISABLED = 'oauth-management.client_disabled',
  OAUTH_CLIENT_SECRET_ROTATED = 'oauth-management.client_secret_rotated',
  OAUTH_CLIENT_REVOKED = 'oauth-management.client_revoked',
  OAUTH_CLIENT_ARCHIVED = 'oauth-management.client_archived',
  OAUTH_CONNECTION_AUTHORIZED = 'oauth-management.connection_authorized',
  OAUTH_CONNECTION_REFRESHED = 'oauth-management.connection_refreshed',
  OAUTH_CONNECTION_REFRESH_FAILED = 'oauth-management.connection_refresh_failed',
  OAUTH_CONNECTION_REVOKED = 'oauth-management.connection_revoked',
  OAUTH_CONNECTION_DISCONNECTED = 'oauth-management.connection_disconnected',
  OAUTH_CONNECTION_EXPIRED = 'oauth-management.connection_expired',
}

export interface IOAuthClient {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: OAuthScopeType;
  scopeKey: string;
  name: string;
  description: string | null;
  providerKey: string;
  clientId: string;
  encryptedClientSecret: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: string[];
  environment: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string | null;
  userInfoEndpoint: string | null;
  status: OAuthClientStatus;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthConnection {
  id: string;
  clientId: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: OAuthScopeType;
  scopeKey: string;
  ownerUserId: string | null;
  serviceAccountHandle: string | null;
  providerKey: string;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
  grantedScopes: string[];
  grantType: string;
  status: OAuthConnectionStatus;
  encryptedAccessToken: string | null;
  encryptedRefreshToken: string | null;
  accessTokenExpiresAt: Date | null;
  consentedAt: Date | null;
  lastRefreshedAt: Date | null;
  lastUsedAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
  consecutiveFailures: number;
  revokedAt: Date | null;
  revokedReason: string | null;
  disconnectedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOAuthAuthorizationRequest {
  id: string;
  clientId: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: OAuthScopeType;
  scopeKey: string;
  initiatedByUserId: string | null;
  state: string;
  nonce: string;
  redirectUri: string;
  requestedScopes: string[];
  status: OAuthAuthorizationRequestStatus;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface IOAuthHistory {
  id: string;
  entityType: OAuthHistoryEntityType;
  entityId: string;
  workspaceId: string | null;
  changeType: OAuthChangeType;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IOAuthAuthorizeResult {
  authorizationUrl: string;
  state: string;
  expiresAt: Date;
}

export interface IOAuthConnectionTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}

export interface IOAuthManagementEventPayload {
  event: OAuthManagementEvent;
  entityType: OAuthHistoryEntityType;
  entityId: string;
  workspaceId?: string | null;
  scopeKey?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
