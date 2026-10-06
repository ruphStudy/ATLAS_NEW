import { UserRole } from '@prisma/client';

/** Compliance audit logs default to a much longer retention window than the Activity Center's UX feed. */
export const DEFAULT_AUDIT_RETENTION_DAYS = 365;

/** Roles permitted to view raw audit log entries. */
export const AUDIT_LOG_VIEW_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];

/** Roles permitted to export audit logs (bulk data egress — stricter than viewing). */
export const AUDIT_LOG_EXPORT_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN];

/** Repeated-failure suspicious-activity heuristic. */
export const SUSPICIOUS_ACTIVITY_WINDOW_MS = 15 * 60 * 1000;
export const SUSPICIOUS_ACTIVITY_FAILURE_THRESHOLD = 5;
