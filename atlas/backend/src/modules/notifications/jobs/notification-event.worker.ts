import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { INotificationEventPayload, NotificationEvent } from '../interfaces';

/**
 * Consumes notification lifecycle events for real-time delivery / downstream
 * consumers (e.g. a websocket gateway, or the out-of-scope email/push/SMS
 * dispatchers referenced by NotificationPreference.channel). This worker
 * itself only logs — actual external delivery is intentionally kept outside
 * this module.
 */
@Processor(QUEUE_NAMES.NOTIFICATION_EVENTS)
export class NotificationEventWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationEventWorker.name);

  async process(job: Job<INotificationEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    this.logger.log(
      `Processing notification event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case NotificationEvent.NOTIFICATION_CREATED:
        this.logger.debug(
          `Notification created: ${job.data.notificationId} for user ${job.data.recipientUserId}`,
        );
        break;
      case NotificationEvent.NOTIFICATION_BULK_CREATED:
        this.logger.log(
          `Bulk notification created: group ${job.data.groupId} (${JSON.stringify(job.data.metadata)})`,
        );
        break;
      case NotificationEvent.NOTIFICATION_READ:
        this.logger.debug(`Notification read: ${job.data.notificationId}`);
        break;
      case NotificationEvent.NOTIFICATION_ALL_READ:
        this.logger.debug(
          `All notifications read for user ${job.data.recipientUserId}: ${JSON.stringify(job.data.metadata)}`,
        );
        break;
      case NotificationEvent.NOTIFICATION_ARCHIVED:
        this.logger.debug(`Notification archived: ${job.data.notificationId}`);
        break;
      case NotificationEvent.NOTIFICATION_RESTORED:
        this.logger.debug(`Notification restored: ${job.data.notificationId}`);
        break;
      case NotificationEvent.NOTIFICATION_DISMISSED:
        this.logger.debug(`Notification dismissed: ${job.data.notificationId}`);
        break;
      case NotificationEvent.NOTIFICATION_DELETED:
        this.logger.debug(`Notification deleted: ${job.data.notificationId}`);
        break;
      case NotificationEvent.NOTIFICATION_EXPIRED:
        this.logger.debug(`Notification expired: ${job.data.notificationId}`);
        break;
      case NotificationEvent.PREFERENCE_UPDATED:
        this.logger.debug(
          `Notification preference updated: ${job.data.preferenceId} for user ${job.data.recipientUserId}`,
        );
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
