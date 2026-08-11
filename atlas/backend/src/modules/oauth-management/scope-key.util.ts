import { OAuthScopeType } from './interfaces';

export interface IOAuthScopeIdentity {
  scopeType: OAuthScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
  ownerUserId?: string | null;
  serviceAccountHandle?: string | null;
}

/** Deterministic encoding of an OAuth client/connection's scope tuple — the same pattern as every other `scopeKey` in this codebase. */
export function buildOAuthScopeKey(identity: IOAuthScopeIdentity): string {
  switch (identity.scopeType) {
    case OAuthScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case OAuthScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    case OAuthScopeType.USER:
      return `USER:${identity.workspaceId}:${identity.ownerUserId}`;
    case OAuthScopeType.SERVICE_ACCOUNT:
      return `SERVICE_ACCOUNT:${identity.workspaceId}:${identity.serviceAccountHandle}`;
    default:
      return 'UNKNOWN';
  }
}
