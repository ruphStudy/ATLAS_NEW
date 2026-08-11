import { QuotaScopeType } from './interfaces';

export interface IQuotaScopeIdentity {
  scopeType: QuotaScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  planKey?: string | null;
}

/** Deterministic encoding of a quota policy/override's scope tuple — the same pattern as every other `scopeKey` in this codebase. */
export function buildQuotaScopeKey(identity: IQuotaScopeIdentity): string {
  switch (identity.scopeType) {
    case QuotaScopeType.GLOBAL:
      return 'GLOBAL';
    case QuotaScopeType.PLAN:
      return `PLAN:${identity.planKey}`;
    case QuotaScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case QuotaScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    case QuotaScopeType.USER:
      return `USER:${identity.workspaceId}:${identity.userId}`;
    default:
      return 'UNKNOWN';
  }
}

/**
 * Every scope key a workspace's quota check could possibly resolve against, ordered from LEAST to
 * MOST specific — the caller ranks candidates by position in this list (last match wins), the same
 * "candidates + rank, highest wins" idiom `SettingsService.resolve()`/Feature Flags use.
 */
export function buildCandidateScopeKeys(workspaceId: string, organizationId?: string, userId?: string, planKey?: string): string[] {
  const keys: string[] = ['GLOBAL'];
  if (planKey) keys.push(`PLAN:${planKey}`);
  if (organizationId) keys.push(`ORG:${organizationId}`);
  keys.push(`WORKSPACE:${workspaceId}`);
  if (userId) keys.push(`USER:${workspaceId}:${userId}`);
  return keys;
}
