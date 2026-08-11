import { RuleScope } from './interfaces';
import { SYSTEM_RULE_SCOPE_KEY } from './constants';

export interface IRuleScopeIdentity {
  scope: RuleScope;
  workspaceId?: string | null;
  organizationId?: string | null;
}

/**
 * Builds a deterministic, always-non-null encoding of a rule's scope tuple —
 * the same pattern as `SettingValue.scopeKey` / `Role.scopeKey` /
 * `Tag.scopeKey` / `Theme.scopeKey`, and for the same reason: Postgres
 * treats NULLs in a plain multi-column unique as distinct, which would
 * otherwise silently allow duplicate rule keys within a scope+module.
 */
export function buildRuleScopeKey(identity: IRuleScopeIdentity): string {
  switch (identity.scope) {
    case RuleScope.GLOBAL:
      return SYSTEM_RULE_SCOPE_KEY;
    case RuleScope.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case RuleScope.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    default:
      return 'UNKNOWN';
  }
}

/** Every scope key visible to a given workspace/organization, from least to most specific — used both for read visibility and for evaluation precedence ordering. */
export function buildVisibleRuleScopeKeys(workspaceId: string, organizationId?: string | null): string[] {
  const keys = [SYSTEM_RULE_SCOPE_KEY];
  if (organizationId) {
    keys.push(`ORG:${organizationId}`);
  }
  keys.push(`WORKSPACE:${workspaceId}`);
  return keys;
}

/** Relative specificity used to order matched rules — WORKSPACE beats ORGANIZATION beats GLOBAL when priority/executionOrder tie. */
export function ruleScopeSpecificity(scope: RuleScope): number {
  switch (scope) {
    case RuleScope.WORKSPACE:
      return 2;
    case RuleScope.ORGANIZATION:
      return 1;
    case RuleScope.GLOBAL:
    default:
      return 0;
  }
}
