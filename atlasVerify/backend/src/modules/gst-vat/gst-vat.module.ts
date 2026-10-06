import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TaxModule } from '../tax/tax.module';

import { GstVatRepository } from './repository/gst-vat.repository';
import { GstVatAudit } from './audit/gst-vat.audit';
import { GstVatEventQueue } from './events/gst-vat-events.queue';
import { GstVatService } from './gst-vat.service';
import { GstVatController } from './gst-vat.controller';

/**
 * GstVatModule — a domain-specific GST/VAT compliance layer built on
 * top of the Tax Engine. It never re-implements rate resolution or
 * amount calculation — every amount comes from `TaxService.calculateTax()`.
 * This module only owns GST/VAT-specific concerns: registrations, tax
 * codes, input/output treatment classification (intra/inter-region,
 * reverse charge, zero-rated, exempt), Input Tax Credit eligibility,
 * and credit/debit adjustments — all layered on the Tax Engine's
 * immutable calculation records.
 */
@Module({
  imports: [DatabaseModule, AuditLogsModule, TaxModule],
  controllers: [GstVatController],
  providers: [GstVatRepository, GstVatAudit, GstVatEventQueue, GstVatService],
  exports: [GstVatService],
})
export class GstVatModule {}
