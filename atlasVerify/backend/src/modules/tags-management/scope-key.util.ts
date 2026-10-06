import { TagScope } from './interfaces';

export interface ITagScopeIdentity {
  scope: TagScope;
  workspaceId?: string | null;
  organizationId?: string | null;
  module?: string | null;
}

/**
 * Builds a deterministic, always-non-null encoding of a tag's scope tuple.
 * `Tag.scopeKey` (and `TagGroup.scopeKey`) are uniquely constrained on this
 * value specifically so duplicate-name prevention actually works — Postgres
 * treats NULLs in a plain multi-column unique as distinct, which would
 * otherwise silently allow duplicate names when workspaceId/module are null
 * (same reasoning as `SettingValue.scopeKey` / `Role.scopeKey`).
 */
export function buildTagScopeKey(identity: ITagScopeIdentity): string {
  switch (identity.scope) {
    case TagScope.GLOBAL:
      return 'GLOBAL';
    case TagScope.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case TagScope.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    case TagScope.MODULE:
      return `MODULE:${identity.workspaceId}:${identity.module}`;
    default:
      return 'UNKNOWN';
  }
}

/** Normalizes a display name into a comparable slug — the actual uniqueness key alongside `scopeKey`. */
export function slugifyTagName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
