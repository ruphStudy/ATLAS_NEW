export const SAAS_AUDIT_MODULE = 'saas-audit';

/** Sentinel `workspaceId` used only when calling the shared `StorageModule` provider for a platform-wide (non-single-tenant) archive — the provider just namespaces a directory/prefix by this string, never a real workspace. */
export const SAAS_AUDIT_PLATFORM_STORAGE_SCOPE = 'platform';

/** Modules whose successful DELETE-category actions are sensitive enough to raise a destructive-action incident. */
export const SAAS_AUDIT_DESTRUCTIVE_MODULES: string[] = [
  'workspace',
  'saas-administration',
  'subscription-management',
  'billing-engine',
  'license-management',
  'app-store',
  'plugin-framework',
  'oauth-management',
  'sso-framework',
];

/** Suspicious-cross-tenant-access heuristic: the same actor touching this many distinct workspaces within the window is flagged. */
export const CROSS_TENANT_ACCESS_WORKSPACE_THRESHOLD = 3;
export const CROSS_TENANT_ACCESS_WINDOW_MS = 30 * 60 * 1000;

/** How far back each on-demand detection sweep looks for privilege-escalation/destructive/repeated-failure candidates. */
export const DETECTION_SWEEP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Per-detection-type row cap for a single sweep invocation — bounds cost; a wider sweep is just invoked again. */
export const DETECTION_SWEEP_ROW_LIMIT = 200;

export const SAAS_AUDIT_DEFAULT_RETENTION_DAYS = 365;

/** Row cap for a single archive/export batch — bounded so a huge date range can't OOM one call. */
export const SAAS_AUDIT_MAX_EXPORT_ROWS = 10_000;

export const SAAS_AUDIT_INCIDENT_SORT_FIELDS = ['createdAt', 'updatedAt'] as const;
export const SAAS_AUDIT_ARCHIVE_SORT_FIELDS = ['createdAt', 'fromDate'] as const;
