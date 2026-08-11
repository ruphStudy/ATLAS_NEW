import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { TaskManagementModule } from '@modules/task-management/task-management.module';
import { ApprovalWorkflowModule } from '@modules/approval-workflow/approval-workflow.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { BusinessRulesEngineController } from './business-rules-engine.controller';
import { BusinessRulesEngineService } from './business-rules-engine.service';
import { BusinessRulesEngineRepository } from './business-rules-engine.repository';
import { RuleCacheService } from './rule-cache.service';
import { RuleActionRegistryService } from './rule-action-registry.service';
import {
  NotifyActionHandler,
  CreateTaskActionHandler,
  RequireApprovalActionHandler,
  EmitEventActionHandler,
} from './actions';
import { BusinessRulesEngineEventQueue, BusinessRulesEngineEventWorker } from './jobs';

/**
 * BusinessRulesEngineModule — the central, configuration-driven rules
 * engine reusable across every ATLAS module. Conditions/operators/AND-OR
 * groups/priorities are evaluated generically; actions run through
 * `RuleActionRegistryService` so the core engine never embeds
 * module-specific business logic — it ships built-in handlers only for
 * actions that themselves wrap already-generic modules (Notification
 * Center, Task Management, Approval Workflow), reusing the same
 * scope-key/versioning/lifecycle/event-driven-cache patterns established by
 * Roles & Permissions, Approval Workflow, Tags Management and Theme
 * Management this session. `RuleActionRegistryService` and
 * `BusinessRulesEngineService` are exported so owning modules can register
 * their own action handlers (e.g. `UPDATE_STATUS`, `ROUTE_WORKFLOW`) and
 * invoke `evaluate()` from their own controllers/event workers/workflow steps.
 */
@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    TaskManagementModule,
    ApprovalWorkflowModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.BUSINESS_RULES_ENGINE_EVENTS,
    }),
  ],
  controllers: [BusinessRulesEngineController],
  providers: [
    BusinessRulesEngineService,
    BusinessRulesEngineRepository,
    RuleCacheService,
    RuleActionRegistryService,
    NotifyActionHandler,
    CreateTaskActionHandler,
    RequireApprovalActionHandler,
    EmitEventActionHandler,
    BusinessRulesEngineEventQueue,
    BusinessRulesEngineEventWorker,
  ],
  exports: [BusinessRulesEngineService, RuleActionRegistryService],
})
export class BusinessRulesEngineModule {}
