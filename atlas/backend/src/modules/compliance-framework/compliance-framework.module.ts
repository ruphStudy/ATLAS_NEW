import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { DocumentManagementModule } from '@modules/document-management/document-management.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { ComplianceFrameworkController } from './compliance-framework.controller';
import { ComplianceFrameworkService } from './compliance-framework.service';
import { ComplianceFrameworkRepository } from './compliance-framework.repository';
import { ComplianceFrameworkCache } from './cache/compliance-framework.cache';
import { ComplianceFrameworkEventQueue, ComplianceFrameworkEventWorker } from './jobs';

/**
 * ComplianceFrameworkModule — a central, configuration-driven compliance
 * layer gating regulated actions (supplier approval, procurement, listing,
 * marketplace publishing, warehouse operations) on requirement status.
 * No country/marketplace regulation is ever hardcoded here: every
 * requirement rule is data, optionally scoped by country, region,
 * marketplace, product category, supplier, warehouse and business type,
 * with global defaults overridable per workspace. Evidence files are
 * delegated entirely to Document Management (referenced only via
 * `ComplianceRecord.evidenceDocumentId`), reminders/escalation go through
 * Notifications, and every workspace-scoped action is also written to the
 * central Audit Logs ledger.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    DocumentManagementModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.COMPLIANCE_FRAMEWORK_EVENTS,
    }),
  ],
  controllers: [ComplianceFrameworkController],
  providers: [
    ComplianceFrameworkService,
    ComplianceFrameworkRepository,
    ComplianceFrameworkCache,
    ComplianceFrameworkEventQueue,
    ComplianceFrameworkEventWorker,
  ],
  exports: [ComplianceFrameworkService, ComplianceFrameworkRepository],
})
export class ComplianceFrameworkModule {}
