import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/constants';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceAuditController } from './marketplace-audit.controller';
import { MarketplaceAuditService } from './marketplace-audit.service';
import { MarketplaceAuditRepository } from './repository/marketplace-audit.repository';
import { MetadataSanitizer } from './sanitizer/metadata.sanitizer';
import { SuspiciousActivityDetector } from './detector/suspicious-activity.detector';
import { AuditEventQueue } from './events/audit-event.queue';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_AUDIT_EVENTS }),
  ],
  controllers: [MarketplaceAuditController],
  providers: [
    MarketplaceAuditService,
    MarketplaceAuditRepository,
    MetadataSanitizer,
    SuspiciousActivityDetector,
    AuditEventQueue,
  ],
  exports: [
    MarketplaceAuditService,
    MarketplaceAuditRepository,
    MetadataSanitizer,
  ],
})
export class MarketplaceAuditModule {}
