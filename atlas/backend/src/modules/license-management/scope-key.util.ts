import { LicenseScopeType } from './interfaces';

export interface ILicenseScopeIdentity {
  scopeType: LicenseScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
  ownerUserId?: string | null;
  environment?: string | null;
  deploymentId?: string | null;
}

/** Deterministic encoding of a license's scope tuple — the same pattern as every other `scopeKey` in this codebase. */
export function buildLicenseScopeKey(identity: ILicenseScopeIdentity): string {
  switch (identity.scopeType) {
    case LicenseScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case LicenseScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    case LicenseScopeType.USER:
      return `USER:${identity.workspaceId}:${identity.ownerUserId}`;
    case LicenseScopeType.ENVIRONMENT:
      return `ENVIRONMENT:${identity.workspaceId}:${identity.environment}`;
    case LicenseScopeType.DEPLOYMENT:
      return `DEPLOYMENT:${identity.workspaceId}:${identity.deploymentId}`;
    default:
      return 'UNKNOWN';
  }
}
