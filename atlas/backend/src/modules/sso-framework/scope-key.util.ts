import { SsoScopeType } from './interfaces';

export interface ISsoScopeIdentity {
  scopeType: SsoScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
}

/** Deterministic encoding of an SSO connection's scope tuple — the same pattern as every other `scopeKey` in this codebase. */
export function buildSsoScopeKey(identity: ISsoScopeIdentity): string {
  switch (identity.scopeType) {
    case SsoScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case SsoScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    default:
      return 'UNKNOWN';
  }
}
