import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { BillingEngineModule } from '@modules/billing-engine/billing-engine.module';
import { DocumentManagementModule } from '@modules/document-management/document-management.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { InvoiceManagementController } from './invoice-management.controller';
import { InvoiceManagementService } from './invoice-management.service';
import { InvoiceManagementRepository } from './invoice-management.repository';
import { InvoiceManagementEventQueue, InvoiceManagementEventWorker } from './jobs';

/**
 * InvoiceManagementModule — generates formal, customer-facing invoices from
 * finalized Billing Engine `BillingPeriod` records. Line items and totals
 * are copied verbatim from Billing Engine at generation time and never
 * recalculated here. PDF rendering is not implemented here — `attachDocument`
 * stores an already-rendered document via the existing Document Management
 * module; delivery reuses the existing Notification Center. No
 * payment-provider logic — payment/void/refund state is reconciled FROM
 * Billing Engine via `processBillingSync`, never computed independently.
 */
@Module({
  imports: [
    DatabaseModule,
    BillingEngineModule,
    DocumentManagementModule,
    NotificationsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.INVOICE_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [InvoiceManagementController],
  providers: [InvoiceManagementService, InvoiceManagementRepository, InvoiceManagementEventQueue, InvoiceManagementEventWorker],
  exports: [InvoiceManagementService],
})
export class InvoiceManagementModule {}
