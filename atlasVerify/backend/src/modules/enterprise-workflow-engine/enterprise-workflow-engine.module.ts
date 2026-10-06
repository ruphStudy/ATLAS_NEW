import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { MultiBusinessModule } from '@modules/multi-business/multi-business.module';
import { BusinessRulesEngineModule } from '@modules/business-rules-engine/business-rules-engine.module';
import { TaskManagementModule } from '@modules/task-management/task-management.module';
import { ApprovalWorkflowModule } from '@modules/approval-workflow/approval-workflow.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AiWorkflowModule } from '@modules/ai-workflow/ai-workflow.module';

import { EnterpriseWorkflowEngineController } from './enterprise-workflow-engine.controller';
import { EnterpriseWorkflowEngineService } from './enterprise-workflow-engine.service';
import { EnterpriseWorkflowEngineRepository } from './enterprise-workflow-engine.repository';
import { EnterpriseWorkflowEngineValidator } from './validator/enterprise-workflow-engine.validator';
import { EnterpriseWorkflowEngineAudit } from './audit/enterprise-workflow-engine.audit';
import { WorkflowStepExecutorRegistry } from './registry/workflow-step-executor.registry';
import {
  AiWorkflowStepExecutor,
  ApprovalStepExecutor,
  ConditionStepExecutor,
  NotificationStepExecutor,
  RuleEvaluationStepExecutor,
  TaskStepExecutor,
  TimerStepExecutor,
} from './executors';
import { EnterpriseWorkflowEngineEventQueue, EnterpriseWorkflowEngineEventWorker } from './jobs';

/**
 * EnterpriseWorkflowEngineModule
 *
 * A generic, configuration-driven workflow engine reusable across every
 * ATLAS module. Stage/step definitions are plain JSON; the engine itself
 * never embeds business logic. Steps that map onto an already-generic
 * module (Task Management, Approval Workflow, Notification Center,
 * Business Rules Engine, AI Workflow Engine) run through a built-in
 * `IWorkflowStepExecutor`; `WorkflowStepExecutorRegistry` is exported so
 * owning modules can register their own step executors for
 * module-specific `BUSINESS_ACTION`/`EXTERNAL_INTEGRATION` step types,
 * mirroring `RuleActionRegistryService` in Business Rules Engine. This
 * module never duplicates the AI Workflow Engine — `AI_WORKFLOW` steps
 * delegate entirely to `AiWorkflowService.executeWorkflow()`.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    RolesPermissionsModule,
    MultiBusinessModule,
    BusinessRulesEngineModule,
    TaskManagementModule,
    forwardRef(() => ApprovalWorkflowModule),
    NotificationsModule,
    AiWorkflowModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.WORKFLOW_ENGINE_EVENTS }),
  ],
  controllers: [EnterpriseWorkflowEngineController],
  providers: [
    EnterpriseWorkflowEngineRepository,
    EnterpriseWorkflowEngineValidator,
    EnterpriseWorkflowEngineAudit,
    WorkflowStepExecutorRegistry,
    TaskStepExecutor,
    ApprovalStepExecutor,
    NotificationStepExecutor,
    RuleEvaluationStepExecutor,
    AiWorkflowStepExecutor,
    ConditionStepExecutor,
    TimerStepExecutor,
    EnterpriseWorkflowEngineEventQueue,
    EnterpriseWorkflowEngineEventWorker,
    EnterpriseWorkflowEngineService,
  ],
  exports: [EnterpriseWorkflowEngineService, WorkflowStepExecutorRegistry],
})
export class EnterpriseWorkflowEngineModule {}
