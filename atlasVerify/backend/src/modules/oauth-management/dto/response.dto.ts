import { OAuthClientStatus, OAuthConnectionStatus, OAuthScopeType } from '../interfaces';

/** Never includes `encryptedClientSecret` or the plaintext secret — safe metadata only. */
export class OAuthClientResponseDto {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: OAuthScopeType;
  name: string;
  description: string | null;
  providerKey: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: string[];
  environment: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string | null;
  userInfoEndpoint: string | null;
  status: OAuthClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedOAuthClientResponseDto {
  data: OAuthClientResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Never includes `encryptedAccessToken`/`encryptedRefreshToken` — safe metadata only. */
export class OAuthConnectionResponseDto {
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
  accessTokenExpiresAt: Date | null;
  consentedAt: Date | null;
  lastRefreshedAt: Date | null;
  lastUsedAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedOAuthConnectionResponseDto {
  data: OAuthConnectionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class OAuthHistoryResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class OAuthAuthorizeResponseDto {
  authorizationUrl: string;
  state: string;
  expiresAt: Date;
}

export class OAuthConnectionTestResultResponseDto {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}
