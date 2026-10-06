import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsFoundationController } from './analytics-foundation.controller';
import { AnalyticsFoundationService } from './analytics-foundation.service';
import { AnalyticsFoundationRepository } from './analytics-foundation.repository';
import {
  AnalyticsFoundationEventQueue,
  AnalyticsFoundationEventWorker,
} from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'analytics-foundation-events',
    }),
  ],
  controllers: [AnalyticsFoundationController],
  providers: [
    AnalyticsFoundationService,
    AnalyticsFoundationRepository,
    AnalyticsFoundationEventQueue,
    AnalyticsFoundationEventWorker,
  ],
  exports: [AnalyticsFoundationService],
})
export class AnalyticsFoundationModule {}
