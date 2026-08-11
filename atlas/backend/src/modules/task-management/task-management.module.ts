import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ActivityCenterModule } from '@modules/activity-center/activity-center.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TaskManagementController } from './task-management.controller';
import { TaskManagementService } from './task-management.service';
import { TaskManagementRepository } from './task-management.repository';
import { TaskManagementEventQueue, TaskManagementEventWorker } from './jobs';

/**
 * TaskManagementModule — a generic task framework shared by every ATLAS
 * module (manual, system/workflow/approval/AI-generated tasks). Reuses
 * `RolesPermissionsModule` for role-based assignee eligibility,
 * `NotificationsModule` for assignment/reminder/completion notices,
 * `ActivityCenterModule` for the per-task activity timeline (via
 * `timelineId`), and `AuditLogsModule` for the compliance trail — no
 * infrastructure duplicated. File attachments reference File Management's
 * `FileRecord.id` by id only; this module never stores file bytes.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    NotificationsModule,
    ActivityCenterModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.TASK_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [TaskManagementController],
  providers: [
    TaskManagementService,
    TaskManagementRepository,
    TaskManagementEventQueue,
    TaskManagementEventWorker,
  ],
  exports: [TaskManagementService],
})
export class TaskManagementModule {}
