import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { ApprovalWorkflowController } from './approval-workflow.controller';
import { ApprovalWorkflowService } from './approval-workflow.service';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalWorkflowRepository } from './approval-workflow.repository';
import { ApprovalWorkflowEventQueue, ApprovalWorkflowEventWorker } from './jobs';

/**
 * ApprovalWorkflowModule — a generic, reusable approval engine for
 * procurement, purchase orders, listings, pricing, inventory adjustments,
 * documents, refunds and any other owning module. The engine only
 * interprets its own generic step/condition/routing configuration; owning
 * modules retain all of their own business rules and simply start/observe
 * requests via this module's API and lifecycle events (published on
 * `approval-workflow-events`, filterable by `module`/`entityType`/
 * `entityId` — the generic "resume owning-module workflows" contract).
 * Reuses `RolesPermissionsModule` for role-based approver eligibility,
 * `NotificationsModule` for reminders/decisions, and `AuditLogsModule` for
 * the compliance trail — nothing here duplicates that infrastructure.
 */
@Module({
  imports: [
    DatabaseModule,
    RolesPermissionsModule,
    NotificationsModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.APPROVAL_WORKFLOW_EVENTS,
    }),
  ],
  controllers: [ApprovalWorkflowController],
  providers: [
    ApprovalWorkflowService,
    ApprovalEngineService,
    ApprovalWorkflowRepository,
    ApprovalWorkflowEventQueue,
    ApprovalWorkflowEventWorker,
  ],
  exports: [ApprovalWorkflowService],
})
export class ApprovalWorkflowModule {}
