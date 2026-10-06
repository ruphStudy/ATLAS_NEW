import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiAnalyticsController } from './ai-analytics.controller';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiAnalyticsRepository } from './ai-analytics.repository';
import { AiAnalyticsEventQueue, AiAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-analytics-events',
    }),
  ],
  controllers: [AiAnalyticsController],
  providers: [
    AiAnalyticsService,
    AiAnalyticsRepository,
    AiAnalyticsEventQueue,
    AiAnalyticsEventWorker,
  ],
  exports: [AiAnalyticsService],
})
export class AiAnalyticsModule {}
