import { BillingRuleScope } from './interfaces';

export interface IBillingRuleScopeIdentity {
  scope: BillingRuleScope;
  workspaceId?: string | null;
  organizationId?: string | null;
  planKey?: string | null;
  country?: string | null;
  region?: string | null;
}

/** Deterministic encoding of a billing rule's scope tuple — same pattern as every other `scopeKey` this session. */
export function buildBillingRuleScopeKey(identity: IBillingRuleScopeIdentity): string {
  switch (identity.scope) {
    case BillingRuleScope.GLOBAL:
      return 'GLOBAL';
    case BillingRuleScope.COUNTRY:
      return `COUNTRY:${identity.country}`;
    case BillingRuleScope.REGION:
      return `REGION:${identity.region}`;
    case BillingRuleScope.PLAN:
      return `PLAN:${identity.planKey}`;
    case BillingRuleScope.TENANT:
      return identity.workspaceId ? `WORKSPACE:${identity.workspaceId}` : `ORG:${identity.organizationId}`;
    default:
      return 'UNKNOWN';
  }
}
