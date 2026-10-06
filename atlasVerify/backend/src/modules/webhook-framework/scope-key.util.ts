import { WebhookScopeType } from './interfaces';

export interface IWebhookScopeIdentity {
  scopeType: WebhookScopeType;
  workspaceId?: string | null;
  organizationId?: string | null;
}

/** Deterministic encoding of a webhook endpoint's scope tuple — the same pattern as every other `scopeKey` in this codebase. */
export function buildWebhookScopeKey(identity: IWebhookScopeIdentity): string {
  switch (identity.scopeType) {
    case WebhookScopeType.ORGANIZATION:
      return `ORG:${identity.organizationId}`;
    case WebhookScopeType.WORKSPACE:
      return `WORKSPACE:${identity.workspaceId}`;
    default:
      return 'UNKNOWN';
  }
}
