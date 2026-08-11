import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AnalyticsAuditController } from './analytics-audit.controller';
import { AnalyticsAuditService } from './analytics-audit.service';
import { AnalyticsAuditRepository } from './analytics-audit.repository';
import { AnalyticsAuditEventQueue, AnalyticsAuditEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'analytics-audit-events',
    }),
  ],
  controllers: [AnalyticsAuditController],
  providers: [
    AnalyticsAuditService,
    AnalyticsAuditRepository,
    AnalyticsAuditEventQueue,
    AnalyticsAuditEventWorker,
  ],
  exports: [AnalyticsAuditService],
})
export class AnalyticsAuditModule {}
