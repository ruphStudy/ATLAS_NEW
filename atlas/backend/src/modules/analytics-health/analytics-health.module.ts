import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AnalyticsHealthController } from './analytics-health.controller';
import { AnalyticsHealthService } from './analytics-health.service';
import { AnalyticsHealthRepository } from './analytics-health.repository';
import { AnalyticsHealthEventQueue, AnalyticsHealthEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'analytics-health-events',
    }),
  ],
  controllers: [AnalyticsHealthController],
  providers: [
    AnalyticsHealthService,
    AnalyticsHealthRepository,
    AnalyticsHealthEventQueue,
    AnalyticsHealthEventWorker,
  ],
  exports: [AnalyticsHealthService],
})
export class AnalyticsHealthModule {}
