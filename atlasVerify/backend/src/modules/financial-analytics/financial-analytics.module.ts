import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { FinancialAnalyticsController } from './financial-analytics.controller';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { FinancialAnalyticsRepository } from './financial-analytics.repository';
import { FinancialAnalyticsEventQueue, FinancialAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'financial-analytics-events',
    }),
  ],
  controllers: [FinancialAnalyticsController],
  providers: [
    FinancialAnalyticsService,
    FinancialAnalyticsRepository,
    FinancialAnalyticsEventQueue,
    FinancialAnalyticsEventWorker,
  ],
  exports: [FinancialAnalyticsService],
})
export class FinancialAnalyticsModule {}
