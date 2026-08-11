export enum SsoScopeType {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

export enum SsoProtocol {
  SAML = 'SAML',
  OIDC = 'OIDC',
}

export enum SsoConnectionStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  REVOKED = 'REVOKED',
  ARCHIVED = 'ARCHIVED',
}

export enum SsoEnforcementPolicy {
  ENFORCED = 'ENFORCED',
  OPTIONAL = 'OPTIONAL',
}

export enum SsoLoginRequestStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum SsoChangeType {
  CONNECTION_REGISTERED = 'CONNECTION_REGISTERED',
  CONNECTION_UPDATED = 'CONNECTION_UPDATED',
  CONNECTION_ENABLED = 'CONNECTION_ENABLED',
  CONNECTION_DISABLED = 'CONNECTION_DISABLED',
  CONNECTION_REVOKED = 'CONNECTION_REVOKED',
  CONNECTION_ARCHIVED = 'CONNECTION_ARCHIVED',
  CERTIFICATE_ROTATED = 'CERTIFICATE_ROTATED',
  CLIENT_SECRET_ROTATED = 'CLIENT_SECRET_ROTATED',
  METADATA_REFRESHED = 'METADATA_REFRESHED',
}

export enum SsoFrameworkEvent {
  SSO_CONNECTION_REGISTERED = 'sso-framework.connection_registered',
  SSO_CONNECTION_UPDATED = 'sso-framework.connection_updated',
  SSO_CONNECTION_ENABLED = 'sso-framework.connection_enabled',
  SSO_CONNECTION_DISABLED = 'sso-framework.connection_disabled',
  SSO_CONNECTION_REVOKED = 'sso-framework.connection_revoked',
  SSO_CONNECTION_ARCHIVED = 'sso-framework.connection_archived',
  SSO_CERTIFICATE_ROTATED = 'sso-framework.certificate_rotated',
  SSO_CLIENT_SECRET_ROTATED = 'sso-framework.client_secret_rotated',
  SSO_METADATA_REFRESHED = 'sso-framework.metadata_refreshed',
  SSO_LOGIN_SUCCEEDED = 'sso-framework.login_succeeded',
  SSO_LOGIN_FAILED = 'sso-framework.login_failed',
  SSO_IDENTITY_PROVISIONED = 'sso-framework.identity_provisioned',
  SSO_LOGOUT = 'sso-framework.logout',
}

export interface ISsoConnection {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: SsoScopeType;
  scopeKey: string;
  name: string;
  description: string | null;
  protocol: SsoProtocol;
  status: SsoConnectionStatus;
  enforcementPolicy: SsoEnforcementPolicy;
  domains: string[];
  scopes: string[];
  issuer: string | null;
  entityId: string | null;
  clientId: string | null;
  metadataUrl: string | null;
  metadataXml: string | null;
  metadataFetchedAt: Date | null;
  ssoUrl: string | null;
  sloUrl: string | null;
  authorizationEndpoint: string | null;
  tokenEndpoint: string | null;
  jwksUri: string | null;
  userInfoEndpoint: string | null;
  endSessionEndpoint: string | null;
  encryptedCertificate: string | null;
  encryptedClientSecret: string | null;
  jitProvisioningEnabled: boolean;
  groupClaimName: string | null;
  defaultRoleId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISsoGroupRoleMapping {
  id: string;
  connectionId: string;
  externalGroup: string;
  roleId: string;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISsoIdentity {
  id: string;
  connectionId: string;
  workspaceId: string | null;
  userId: string;
  externalUserId: string;
  externalEmail: string;
  externalGroups: string[];
  provisionedAt: Date;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISsoLoginRequest {
  id: string;
  connectionId: string;
  workspaceId: string | null;
  organizationId: string | null;
  state: string;
  nonce: string | null;
  relayState: string | null;
  domain: string | null;
  status: SsoLoginRequestStatus;
  failureReason: string | null;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ISsoHistory {
  id: string;
  connectionId: string;
  workspaceId: string | null;
  changeType: SsoChangeType;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface ISsoInitiateLoginResult {
  redirectUrl: string;
  state: string;
  expiresAt: Date;
}

/** Normalized output of either protocol's assertion/token validation — the service layer only ever deals with this shape, never raw SAML XML or a raw ID token. */
export interface ISsoNormalizedIdentity {
  externalUserId: string;
  externalEmail: string;
  externalGroups: string[];
  raw?: Record<string, unknown>;
}

export interface ISsoLoginResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  workspaceId: string;
  isNewIdentity: boolean;
}

export interface ISsoLogoutResult {
  idpLogoutUrl?: string;
}

export interface ISsoFrameworkEventPayload {
  event: SsoFrameworkEvent;
  connectionId: string;
  workspaceId?: string | null;
  scopeKey?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
