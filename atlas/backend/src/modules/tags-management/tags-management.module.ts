import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { ActivityCenterModule } from '@modules/activity-center/activity-center.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TagsManagementController } from './tags-management.controller';
import { TagsManagementService } from './tags-management.service';
import { TagsManagementRepository } from './tags-management.repository';
import { TagsManagementEventQueue, TagsManagementEventWorker } from './jobs';

/**
 * TagsManagementModule — a generic tagging framework attachable to any
 * ATLAS entity via `entityType`/`entityId`. Global/organization/workspace/
 * module-scoped tags with duplicate-name prevention (scope-key pattern,
 * mirrors Settings Framework and Roles & Permissions), tag groups, usage
 * counts, saved views, and single/bulk assignment. Reuses
 * `RolesPermissionsModule` for creation/edit/system-tag authorization,
 * `ActivityCenterModule` for the per-entity tagging timeline, and
 * `AuditLogsModule` for the compliance trail — no infrastructure
 * duplicated.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    ActivityCenterModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.TAGS_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [TagsManagementController],
  providers: [
    TagsManagementService,
    TagsManagementRepository,
    TagsManagementEventQueue,
    TagsManagementEventWorker,
  ],
  exports: [TagsManagementService],
})
export class TagsManagementModule {}
