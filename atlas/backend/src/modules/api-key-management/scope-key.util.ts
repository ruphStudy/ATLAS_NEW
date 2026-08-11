import { ApiKeyScopeType } from './interfaces';

export interface IApiKeyScopeIdentity {
  scopeType: ApiKeyScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
  ownerUserId?: string | null;
  serviceAccountHandle?: string | null;
}

/** Deterministic encoding of an API key's scope tuple — the same pattern as every other `scopeKey` this session. */
export function buildApiKeyScopeKey(identity: IApiKeyScopeIdentity): string {
  switch (identity.scopeType) {
    case ApiKeyScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case ApiKeyScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    case ApiKeyScopeType.USER:
      return `USER:${identity.workspaceId}:${identity.ownerUserId}`;
    case ApiKeyScopeType.SERVICE_ACCOUNT:
      return `SERVICE_ACCOUNT:${identity.workspaceId}:${identity.serviceAccountHandle}`;
    default:
      return 'UNKNOWN';
  }
}
