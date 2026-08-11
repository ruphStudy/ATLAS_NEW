import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { SupplierAnalyticsController } from './supplier-analytics.controller';
import { SupplierAnalyticsService } from './supplier-analytics.service';
import { SupplierAnalyticsRepository } from './supplier-analytics.repository';
import { SupplierAnalyticsEventQueue, SupplierAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'supplier-analytics-events',
    }),
  ],
  controllers: [SupplierAnalyticsController],
  providers: [
    SupplierAnalyticsService,
    SupplierAnalyticsRepository,
    SupplierAnalyticsEventQueue,
    SupplierAnalyticsEventWorker,
  ],
  exports: [SupplierAnalyticsService],
})
export class SupplierAnalyticsModule {}
