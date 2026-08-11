import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { ProcurementAnalyticsController } from './procurement-analytics.controller';
import { ProcurementAnalyticsService } from './procurement-analytics.service';
import { ProcurementAnalyticsRepository } from './procurement-analytics.repository';
import { ProcurementAnalyticsEventQueue, ProcurementAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'procurement-analytics-events',
    }),
  ],
  controllers: [ProcurementAnalyticsController],
  providers: [
    ProcurementAnalyticsService,
    ProcurementAnalyticsRepository,
    ProcurementAnalyticsEventQueue,
    ProcurementAnalyticsEventWorker,
  ],
  exports: [ProcurementAnalyticsService],
})
export class ProcurementAnalyticsModule {}
