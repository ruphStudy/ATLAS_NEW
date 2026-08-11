import { SubscriptionScope } from './interfaces';

export interface ISubscriptionScopeIdentity {
  scope: SubscriptionScope;
  organizationId?: string | null;
  workspaceId?: string | null;
}

/**
 * Builds a deterministic, always-non-null encoding of a subscription's
 * scope tuple — the same pattern as `Role.scopeKey` / `Tag.scopeKey` /
 * `Theme.scopeKey` / `RuleDefinition.scopeKey` this session, used to look up
 * "the subscription for this tenant" without a plain multi-column query
 * silently matching the wrong row when one side is null.
 */
export function buildSubscriptionScopeKey(identity: ISubscriptionScopeIdentity): string {
  switch (identity.scope) {
    case SubscriptionScope.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case SubscriptionScope.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    default:
      return 'UNKNOWN';
  }
}
