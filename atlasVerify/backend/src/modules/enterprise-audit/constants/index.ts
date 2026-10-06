export const ENTERPRISE_AUDIT_MODULE = 'enterprise-audit';

/** Permission "resource" names for `PermissionResolverService.hasPermission()` — same style as every other Enterprise-family module's validator. */
export const ENTERPRISE_AUDIT_TRAIL_RESOURCE = 'trail';
export const ENTERPRISE_AUDIT_INCIDENT_RESOURCE = 'incident';

/** Row cap for a single organization-scoped export batch — bounded so a huge date range can't OOM one call (mirrors `SAAS_AUDIT_MAX_EXPORT_ROWS`). */
export const ENTERPRISE_AUDIT_MAX_EXPORT_ROWS = 10_000;

/** Per-invocation cap on how many of an organization's workspaces a single policy-violation sweep call will loop over — bounds cost; a wider sweep is just invoked again. */
export const ENTERPRISE_AUDIT_SWEEP_WORKSPACE_LIMIT = 100;
