import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsModule } from '@modules/settings/settings.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { OperationsHealthController } from './operations-health.controller';
import { OperationsHealthService } from './operations-health.service';
import { OperationsHealthMonitorService } from './operations-health-monitor.service';
import { OperationsHealthRepository } from './operations-health.repository';
import { OperationsHealthEventQueue, OperationsHealthEventWorker } from './jobs';

/**
 * OperationsHealthModule — a read-only monitor over the Sprint 9
 * business-operation modules (Notifications, File/Document Management,
 * Approval Workflow, Task Management, Search Framework, Business Rules
 * Engine, Settings). It never imports those modules' services/repositories
 * — only their already-registered BullMQ queues (job counts, pause state —
 * the same queue-introspection pattern used by Marketplace Sync Monitor)
 * and Audit Logs' existing `findAll()` for a windowed failure count — so it
 * cannot duplicate their business logic. Thresholds are configuration-driven
 * via the Settings Framework (registered in `OperationsHealthService.onModuleInit`),
 * mirroring Theme Management's own-setting-registration pattern.
 */
@Module({
  imports: [
    DatabaseModule,
    SettingsModule,
    AuditLogsModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.OPERATIONS_HEALTH_EVENTS },
      { name: QUEUE_NAMES.NOTIFICATION_EVENTS },
      { name: QUEUE_NAMES.FILE_EVENTS },
      { name: QUEUE_NAMES.DOCUMENT_EVENTS },
      { name: QUEUE_NAMES.APPROVAL_WORKFLOW_EVENTS },
      { name: QUEUE_NAMES.TASK_MANAGEMENT_EVENTS },
      { name: QUEUE_NAMES.SEARCH_FRAMEWORK_EVENTS },
      { name: QUEUE_NAMES.BUSINESS_RULES_ENGINE_EVENTS },
      { name: QUEUE_NAMES.SETTINGS_EVENTS },
    ),
  ],
  controllers: [OperationsHealthController],
  providers: [
    OperationsHealthService,
    OperationsHealthMonitorService,
    OperationsHealthRepository,
    OperationsHealthEventQueue,
    OperationsHealthEventWorker,
  ],
  exports: [OperationsHealthService],
})
export class OperationsHealthModule {}
