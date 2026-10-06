import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { ProfitAnalyticsController } from './profit-analytics.controller';
import { ProfitAnalyticsService } from './profit-analytics.service';
import { ProfitAnalyticsRepository } from './profit-analytics.repository';
import { ProfitAnalyticsEventQueue, ProfitAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'profit-analytics-events',
    }),
  ],
  controllers: [ProfitAnalyticsController],
  providers: [
    ProfitAnalyticsService,
    ProfitAnalyticsRepository,
    ProfitAnalyticsEventQueue,
    ProfitAnalyticsEventWorker,
  ],
  exports: [ProfitAnalyticsService],
})
export class ProfitAnalyticsModule {}
