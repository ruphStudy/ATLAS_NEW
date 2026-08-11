import { ThemeScope } from './interfaces';
import { SYSTEM_THEME_SCOPE_KEY } from './constants';

export interface IThemeScopeIdentity {
  scope: ThemeScope;
  workspaceId?: string | null;
  organizationId?: string | null;
}

/**
 * Builds a deterministic, always-non-null encoding of a theme's scope
 * tuple — the same pattern as `SettingValue.scopeKey` / `Role.scopeKey` /
 * `Tag.scopeKey`, and for the same reason: Postgres treats NULLs in a
 * plain multi-column unique as distinct, which would otherwise silently
 * allow duplicate theme keys within a scope.
 */
export function buildThemeScopeKey(identity: IThemeScopeIdentity): string {
  switch (identity.scope) {
    case ThemeScope.GLOBAL:
      return SYSTEM_THEME_SCOPE_KEY;
    case ThemeScope.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case ThemeScope.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    default:
      return 'UNKNOWN';
  }
}
