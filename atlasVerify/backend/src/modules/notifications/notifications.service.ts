import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEventQueue } from './jobs';
import {
  CreateNotificationDto,
  NotificationFilterDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  PreferenceFilterDto,
  PaginatedNotificationResponseDto,
} from './dto';
import {
  INotification,
  INotificationPreference,
  ICreateNotificationResult,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationTargetType,
  NotificationChannel,
  NotificationEvent,
} from './interfaces';
import {
  NotificationNotFoundException,
  NotificationInvalidTargetException,
  NotificationPreferenceNotFoundException,
} from './exceptions/notification.exceptions';
import { generateUUID } from '@common/utils';
import { DEFAULT_NOTIFICATION_RETENTION_DAYS } from './constants';

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  [NotificationPriority.LOW]: 0,
  [NotificationPriority.NORMAL]: 1,
  [NotificationPriority.HIGH]: 2,
  [NotificationPriority.URGENT]: 3,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly eventQueue: NotificationEventQueue,
  ) {}

  // ── Creation (single/bulk/role/workspace-broadcast/team) ─────────

  async create(dto: CreateNotificationDto): Promise<ICreateNotificationResult> {
    const recipientUserIds = await this.resolveRecipients(dto);

    if (recipientUserIds.length === 0) {
      throw new NotificationInvalidTargetException(
        'No recipients could be resolved for this notification target',
      );
    }

    const groupId = generateUUID();
    const priority = dto.priority ?? NotificationPriority.NORMAL;
    const notificationIds: string[] = [];
    let skippedDuplicateCount = 0;
    let suppressedByPreferenceCount = 0;

    for (const recipientUserId of recipientUserIds) {
      if (dto.dedupeKey) {
        const existing = await this.notificationsRepository.findExistingByDedupeKey(
          recipientUserId,
          dto.dedupeKey,
        );
        if (existing) {
          skippedDuplicateCount++;
          continue;
        }
      }

      const suppressed = await this.isSuppressedByPreference(
        recipientUserId,
        dto.category,
        priority,
      );
      if (suppressed) {
        suppressedByPreferenceCount++;
        continue;
      }

      const notification = await this.notificationsRepository.createNotification({
        workspaceId: dto.workspaceId,
        recipientUserId,
        type: dto.type ?? NotificationType.INFO,
        category: dto.category,
        priority,
        title: dto.title,
        message: dto.message,
        sourceModule: dto.sourceModule,
        entityType: dto.entityType,
        entityId: dto.entityId,
        actionLink: dto.actionLink,
        actionRequired: dto.actionRequired ?? false,
        status: NotificationStatus.UNREAD,
        targetType: dto.targetType,
        targetRole: dto.targetType === NotificationTargetType.ROLE ? dto.targetRole : undefined,
        groupId,
        dedupeKey: dto.dedupeKey,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        metadata: dto.metadata ?? {},
      });

      notificationIds.push(notification.id);

      await this.eventQueue.publish({
        event: NotificationEvent.NOTIFICATION_CREATED,
        workspaceId: dto.workspaceId,
        notificationId: notification.id,
        groupId,
        recipientUserId,
      });
    }

    if (notificationIds.length > 1) {
      await this.eventQueue.publish({
        event: NotificationEvent.NOTIFICATION_BULK_CREATED,
        workspaceId: dto.workspaceId,
        groupId,
        metadata: { createdCount: notificationIds.length },
      });
    }

    return {
      groupId,
      createdCount: notificationIds.length,
      skippedDuplicateCount,
      suppressedByPreferenceCount,
      notificationIds,
    };
  }

  private async resolveRecipients(dto: CreateNotificationDto): Promise<string[]> {
    switch (dto.targetType) {
      case NotificationTargetType.USER:
        if (!dto.targetUserId) {
          throw new NotificationInvalidTargetException(
            'targetUserId is required when targetType is USER',
          );
        }
        return [dto.targetUserId];

      case NotificationTargetType.ROLE:
        if (!dto.targetRole) {
          throw new NotificationInvalidTargetException(
            'targetRole is required when targetType is ROLE',
          );
        }
        return this.notificationsRepository.findUserIdsByRole(
          dto.workspaceId,
          dto.targetRole,
        );

      case NotificationTargetType.WORKSPACE:
        return this.notificationsRepository.findUserIdsByWorkspace(dto.workspaceId);

      case NotificationTargetType.TEAM:
        if (!dto.targetUserIds || dto.targetUserIds.length === 0) {
          throw new NotificationInvalidTargetException(
            'targetUserIds is required when targetType is TEAM',
          );
        }
        return [...new Set(dto.targetUserIds)];

      default:
        throw new NotificationInvalidTargetException(
          `Unsupported target type: ${dto.targetType}`,
        );
    }
  }

  private async isSuppressedByPreference(
    recipientUserId: string,
    category: string | undefined,
    priority: NotificationPriority,
  ): Promise<boolean> {
    const preference = await this.notificationsRepository.findApplicablePreference(
      recipientUserId,
      category,
      NotificationChannel.IN_APP,
    );

    if (!preference) return false;
    if (!preference.enabled) return true;

    if (preference.minPriority) {
      const minRank = PRIORITY_RANK[preference.minPriority as NotificationPriority];
      const rank = PRIORITY_RANK[priority];
      if (rank < minRank) return true;
    }

    return false;
  }

  // ── Recipient-scoped reads/mutations ─────────────────────────────

  async findById(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<INotification> {
    const notification = await this.notificationsRepository.findById(
      id,
      workspaceId,
      recipientUserId,
    );
    if (!notification) {
      throw new NotificationNotFoundException(id);
    }
    return notification;
  }

  async findAll(
    workspaceId: string,
    recipientUserId: string,
    filter: NotificationFilterDto,
  ): Promise<PaginatedNotificationResponseDto> {
    await this.notificationsRepository.expireDueNotifications(
      workspaceId,
      recipientUserId,
      new Date(),
    );

    const [data, total] = await this.notificationsRepository.findAll(
      workspaceId,
      recipientUserId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(
    workspaceId: string,
    recipientUserId: string,
  ): Promise<number> {
    await this.notificationsRepository.expireDueNotifications(
      workspaceId,
      recipientUserId,
      new Date(),
    );
    return this.notificationsRepository.countUnread(workspaceId, recipientUserId);
  }

  async markRead(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<INotification> {
    const notification = await this.findById(id, workspaceId, recipientUserId);

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    const updated = await this.notificationsRepository.updateStatus(id, {
      status: NotificationStatus.READ,
      readAt: new Date(),
    });

    await this.eventQueue.publish({
      event: NotificationEvent.NOTIFICATION_READ,
      workspaceId,
      notificationId: id,
      recipientUserId,
    });

    return updated;
  }

  async markAllRead(
    workspaceId: string,
    recipientUserId: string,
  ): Promise<number> {
    const count = await this.notificationsRepository.markAllRead(
      workspaceId,
      recipientUserId,
    );

    await this.eventQueue.publish({
      event: NotificationEvent.NOTIFICATION_ALL_READ,
      workspaceId,
      recipientUserId,
      metadata: { count },
    });

    return count;
  }

  async archive(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<INotification> {
    await this.findById(id, workspaceId, recipientUserId);

    const updated = await this.notificationsRepository.updateStatus(id, {
      status: NotificationStatus.ARCHIVED,
      archivedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: NotificationEvent.NOTIFICATION_ARCHIVED,
      workspaceId,
      notificationId: id,
      recipientUserId,
    });

    return updated;
  }

  async restore(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<INotification> {
    const notification = await this.findById(id, workspaceId, recipientUserId);

    const updated = await this.notificationsRepository.updateStatus(id, {
      status: notification.readAt ? NotificationStatus.READ : NotificationStatus.UNREAD,
      archivedAt: null,
      dismissedAt: null,
    });

    await this.eventQueue.publish({
      event: NotificationEvent.NOTIFICATION_RESTORED,
      workspaceId,
      notificationId: id,
      recipientUserId,
    });

    return updated;
  }

  async dismiss(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<INotification> {
    await this.findById(id, workspaceId, recipientUserId);

    const updated = await this.notificationsRepository.updateStatus(id, {
      status: NotificationStatus.DISMISSED,
      dismissedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: NotificationEvent.NOTIFICATION_DISMISSED,
      workspaceId,
      notificationId: id,
      recipientUserId,
    });

    return updated;
  }

  async remove(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<void> {
    await this.findById(id, workspaceId, recipientUserId);
    await this.notificationsRepository.softDelete(id);

    await this.eventQueue.publish({
      event: NotificationEvent.NOTIFICATION_DELETED,
      workspaceId,
      notificationId: id,
      recipientUserId,
    });
  }

  async purgeRetention(
    workspaceId: string,
    retentionDays?: number,
  ): Promise<number> {
    const days = retentionDays ?? DEFAULT_NOTIFICATION_RETENTION_DAYS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const purged = await this.notificationsRepository.purgeOlderThan(workspaceId, cutoff);
    this.logger.debug(`Purged ${purged} retained notifications for workspace ${workspaceId}`);
    return purged;
  }

  // ── Preferences ──────────────────────────────────────────────────

  async setPreference(
    userId: string,
    workspaceId: string,
    dto: CreateNotificationPreferenceDto,
  ): Promise<INotificationPreference> {
    const preference = await this.notificationsRepository.upsertPreference({
      userId,
      workspaceId,
      category: dto.category ?? null,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      minPriority: dto.minPriority ?? null,
      enabled: dto.enabled ?? true,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: NotificationEvent.PREFERENCE_UPDATED,
      workspaceId,
      recipientUserId: userId,
      preferenceId: preference.id,
    });

    return preference;
  }

  async findPreferences(
    userId: string,
    workspaceId: string,
    filter: PreferenceFilterDto,
  ): Promise<INotificationPreference[]> {
    return this.notificationsRepository.findPreferencesByUser(
      userId,
      workspaceId,
      filter.channel,
    );
  }

  async updatePreference(
    id: string,
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<INotificationPreference> {
    const existing = await this.notificationsRepository.findPreferenceById(id, userId);
    if (!existing) {
      throw new NotificationPreferenceNotFoundException(id);
    }

    const updated = await this.notificationsRepository.updatePreferenceById(id, {
      minPriority: dto.minPriority,
      enabled: dto.enabled,
    });

    await this.eventQueue.publish({
      event: NotificationEvent.PREFERENCE_UPDATED,
      workspaceId: existing.workspaceId,
      recipientUserId: userId,
      preferenceId: id,
    });

    return updated;
  }

  async deletePreference(id: string, userId: string): Promise<void> {
    const existing = await this.notificationsRepository.findPreferenceById(id, userId);
    if (!existing) {
      throw new NotificationPreferenceNotFoundException(id);
    }
    await this.notificationsRepository.deletePreference(id);
  }
}
