import { SettingScope } from './interfaces';
import { SettingInvalidValueException } from './exceptions/settings.exceptions';

export interface IScopeIdentity {
  scope: SettingScope;
  workspaceId?: string | null;
  organizationId?: string | null;
  moduleKey?: string | null;
  userId?: string | null;
}

/**
 * Builds a deterministic, always-non-null encoding of a scope tuple.
 * `SettingValue.scopeKey` is uniquely constrained on `[definitionKey, scopeKey]`
 * specifically so this never relies on Postgres's NULL-is-distinct behavior
 * for the columns that don't apply to a given scope tier.
 */
export function buildScopeKey(identity: IScopeIdentity): string {
  switch (identity.scope) {
    case SettingScope.GLOBAL:
      return 'GLOBAL';
    case SettingScope.ORGANIZATION:
      if (!identity.organizationId) {
        throw new SettingInvalidValueException('organizationId is required for ORGANIZATION scope');
      }
      return `ORG:${identity.organizationId}`;
    case SettingScope.WORKSPACE:
      if (!identity.workspaceId) {
        throw new SettingInvalidValueException('workspaceId is required for WORKSPACE scope');
      }
      return `WORKSPACE:${identity.workspaceId}`;
    case SettingScope.MODULE:
      if (!identity.workspaceId || !identity.moduleKey) {
        throw new SettingInvalidValueException('workspaceId and moduleKey are required for MODULE scope');
      }
      return `MODULE:${identity.workspaceId}:${identity.moduleKey}`;
    case SettingScope.USER:
      if (!identity.workspaceId || !identity.userId) {
        throw new SettingInvalidValueException('workspaceId and userId are required for USER scope');
      }
      return `USER:${identity.workspaceId}:${identity.userId}`;
    default:
      throw new SettingInvalidValueException(`Unknown scope '${identity.scope as string}'`);
  }
}
