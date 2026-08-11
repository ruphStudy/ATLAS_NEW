import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SalesAnalyticsController } from './sales-analytics.controller';
import { SalesAnalyticsService } from './sales-analytics.service';
import { SalesAnalyticsRepository } from './sales-analytics.repository';
import { SalesAnalyticsEventQueue, SalesAnalyticsEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'sales-analytics-events',
    }),
  ],
  controllers: [SalesAnalyticsController],
  providers: [
    SalesAnalyticsService,
    SalesAnalyticsRepository,
    SalesAnalyticsEventQueue,
    SalesAnalyticsEventWorker,
  ],
  exports: [SalesAnalyticsService],
})
export class SalesAnalyticsModule {}
