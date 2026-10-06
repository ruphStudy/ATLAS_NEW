import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ActivityCenterModule } from '@modules/activity-center/activity-center.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { NotesCommentsController } from './notes-comments.controller';
import { NotesCommentsService } from './notes-comments.service';
import { NotesCommentsRepository } from './notes-comments.repository';
import { NotesCommentsEventQueue, NotesCommentsEventWorker } from './jobs';

/**
 * NotesCommentsModule — a generic notes/comments/threaded-discussion
 * framework attachable to any ATLAS entity via `module`/`entityType`/
 * `entityId`. Reuses `RolesPermissionsModule` for TEAM-visibility and
 * admin-edit checks, `NotificationsModule` for @mention notices,
 * `ActivityCenterModule` for the per-entity discussion timeline, and
 * `AuditLogsModule` for the compliance trail. Attachments reference File
 * Management's `FileRecord.id` by id only — no storage duplicated here.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    NotificationsModule,
    ActivityCenterModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTES_COMMENTS_EVENTS,
    }),
  ],
  controllers: [NotesCommentsController],
  providers: [
    NotesCommentsService,
    NotesCommentsRepository,
    NotesCommentsEventQueue,
    NotesCommentsEventWorker,
  ],
  exports: [NotesCommentsService],
})
export class NotesCommentsModule {}
