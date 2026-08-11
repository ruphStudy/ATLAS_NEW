import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationTargetType,
  NotificationChannel,
} from '../interfaces';

export class NotificationResponseDto {
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
  groupId?: string | null;
  readAt?: Date | null;
  archivedAt?: Date | null;
  dismissedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedNotificationResponseDto {
  data: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CreateNotificationResponseDto {
  groupId: string;
  createdCount: number;
  skippedDuplicateCount: number;
  suppressedByPreferenceCount: number;
  notificationIds: string[];
}

export class UnreadCountResponseDto {
  unreadCount: number;
}

export class NotificationPreferenceResponseDto {
  id: string;
  userId: string;
  workspaceId: string;
  category?: string | null;
  channel: NotificationChannel;
  minPriority?: NotificationPriority | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
