export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  APPROVAL = 'APPROVAL',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
  DISMISSED = 'DISMISSED',
  EXPIRED = 'EXPIRED',
}

/**
 * How a notification's recipient(s) were resolved at creation time.
 * TEAM has no dedicated membership model in this codebase today — callers
 * that have their own notion of a "team" resolve it to concrete user ids
 * themselves and pass them in; the notification center just fans out and
 * tags the resulting rows as TEAM-targeted for reporting/filtering.
 */
export enum NotificationTargetType {
  USER = 'USER',
  ROLE = 'ROLE',
  WORKSPACE = 'WORKSPACE',
  TEAM = 'TEAM',
}

/**
 * IN_APP is the only channel this module actually delivers on. The others
 * are stored as preference data only — actual email/push/SMS/webhook
 * delivery is intentionally kept outside this module.
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
}

export enum NotificationEvent {
  NOTIFICATION_CREATED = 'notifications.created',
  NOTIFICATION_BULK_CREATED = 'notifications.bulk_created',
  NOTIFICATION_READ = 'notifications.read',
  NOTIFICATION_ALL_READ = 'notifications.all_read',
  NOTIFICATION_ARCHIVED = 'notifications.archived',
  NOTIFICATION_RESTORED = 'notifications.restored',
  NOTIFICATION_DISMISSED = 'notifications.dismissed',
  NOTIFICATION_DELETED = 'notifications.deleted',
  NOTIFICATION_EXPIRED = 'notifications.expired',
  PREFERENCE_UPDATED = 'notifications.preference_updated',
}

// ── Entity interfaces (mirror the Prisma models) ────────────────────

export interface INotification {
  id: string;
  workspaceId: string;
  recipientUserId: string;
  type: NotificationType;
  category?: string | null;
  priority: NotificationPriority;
  title: string;
  message: string;
  sourceModule?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionLink?: string | null;
  actionRequired: boolean;
  status: NotificationStatus;
  targetType: NotificationTargetType;
  targetRole?: string | null;
  groupId?: string | null;
  dedupeKey?: string | null;
  readAt?: Date | null;
  archivedAt?: Date | null;
  dismissedAt?: Date | null;
  expiresAt?: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface INotificationPreference {
  id: string;
  userId: string;
  workspaceId: string;
  category?: string | null;
  channel: NotificationChannel;
  minPriority?: NotificationPriority | null;
  enabled: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// ── Targeting / creation contracts ───────────────────────────────────

export interface INotificationContent {
  type: NotificationType;
  category?: string;
  priority?: NotificationPriority;
  title: string;
  message: string;
  sourceModule?: string;
  entityType?: string;
  entityId?: string;
  actionLink?: string;
  actionRequired?: boolean;
  dedupeKey?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ICreateNotificationResult {
  groupId: string;
  createdCount: number;
  skippedDuplicateCount: number;
  suppressedByPreferenceCount: number;
  notificationIds: string[];
}

export interface INotificationEventPayload {
  event: NotificationEvent;
  workspaceId: string;
  notificationId?: string;
  groupId?: string;
  recipientUserId?: string;
  preferenceId?: string;
  metadata?: Record<string, unknown>;
}
