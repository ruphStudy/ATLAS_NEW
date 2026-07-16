import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';

/**
 * NotificationsModule
 *
 * Responsibilities:
 *   - In-app notification management
 *   - Email notification dispatch (via queue)
 *   - Notification preferences per user
 *   - Notification read/unread state
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
