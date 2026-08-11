import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditRiskAnalyzer } from './audit-risk-analyzer';
import { AuditLogEventQueue, AuditLogEventWorker } from './jobs';

/**
 * AuditLogsModule — central, immutable audit log for ATLAS.
 *
 * Any module may call `AuditLogsService.record()` after its own business
 * logic completes, to add a lightweight, cross-cutting security/compliance
 * entry (actor, action, entity, module, outcome, reason, correlation/
 * request/job/workflow/session/external ids, safe metadata). This does not
 * replace or duplicate each module's own domain-specific audit/history
 * tables (e.g. AiResponseValidationHistory, NotificationProviderConfigHistory)
 * — those remain authoritative for full domain-specific before/after
 * payloads; this module is the additional, immutable, workspace-isolated
 * ledger with permission-gated viewing/export and rule-based
 * suspicious/high-risk activity detection.
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUDIT_LOG_EVENTS,
    }),
  ],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditLogsRepository,
    AuditRiskAnalyzer,
    AuditLogEventQueue,
    AuditLogEventWorker,
  ],
  exports: [AuditLogsService, AuditLogsRepository],
})
export class AuditLogsModule {}
