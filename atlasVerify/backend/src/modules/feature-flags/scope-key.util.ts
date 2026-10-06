import { FeatureFlagScopeType, IFeatureFlagEvaluationContext } from './interfaces';

export interface IFeatureFlagScopeIdentity {
  scope: FeatureFlagScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  planKey?: string | null;
  environment?: string | null;
}

/** Deterministic encoding of a feature flag override's scope tuple — the same pattern as every other `scopeKey` in this codebase. */
export function buildFeatureFlagScopeKey(identity: IFeatureFlagScopeIdentity): string {
  switch (identity.scope) {
    case FeatureFlagScopeType.GLOBAL:
      return 'GLOBAL';
    case FeatureFlagScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case FeatureFlagScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    case FeatureFlagScopeType.PLAN:
      return `PLAN:${identity.planKey}`;
    case FeatureFlagScopeType.USER:
      return `USER:${identity.workspaceId}:${identity.userId}`;
    case FeatureFlagScopeType.ENVIRONMENT:
      return `ENVIRONMENT:${identity.environment}`;
    default:
      return 'UNKNOWN';
  }
}

/**
 * Every scope key an evaluation `context` could possibly match, in the same order as
 * `FEATURE_FLAG_SCOPE_PRECEDENCE` — GLOBAL always applies, the rest only if the context carries the
 * relevant identifier. `planKey` is resolved by the caller (via Subscription/Plan Management) before
 * this is called, never derived here.
 */
export function buildCandidateScopeKeys(context: IFeatureFlagEvaluationContext, planKey?: string | null): string[] {
  const keys: string[] = ['GLOBAL'];
  if (context.organizationId) keys.push(`ORG:${context.organizationId}`);
  if (planKey) keys.push(`PLAN:${planKey}`);
  if (context.environment) keys.push(`ENVIRONMENT:${context.environment}`);
  if (context.workspaceId) keys.push(`WORKSPACE:${context.workspaceId}`);
  if (context.workspaceId && context.userId) keys.push(`USER:${context.workspaceId}:${context.userId}`);
  return keys;
}
