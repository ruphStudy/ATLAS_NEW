import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEventQueue, NotificationEventWorker } from './jobs';

/**
 * NotificationsModule — Notification Center
 *
 * Responsibilities:
 *   - In-app notification creation (single/bulk/role/workspace/team-targeted)
 *   - Read/unread/archived/dismissed/expired lifecycle state
 *   - Per-user notification preferences by category/priority/channel
 *   - Deduplication (via dedupeKey), expiry and retention
 *   - Lifecycle event publishing for real-time delivery consumers
 *
 * External delivery (email/push/SMS/webhook) is intentionally out of scope —
 * this module only manages in-app notification state and publishes events
 * that an external dispatcher could subscribe to.
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATION_EVENTS,
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationEventQueue,
    NotificationEventWorker,
  ],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
