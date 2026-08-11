import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AiCostTrackingModule } from '@modules/ai-cost-tracking/ai-cost-tracking.module';
import { AiUsageTrackingController } from './ai-usage-tracking.controller';
import { AiUsageTrackingService } from './ai-usage-tracking.service';
import { AiUsageTrackingRepository } from './ai-usage-tracking.repository';
import { AiUsageEventQueue, AiUsageEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    AiCostTrackingModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AI_USAGE_EVENTS,
    }),
  ],
  controllers: [AiUsageTrackingController],
  providers: [
    AiUsageTrackingService,
    AiUsageTrackingRepository,
    AiUsageEventQueue,
    AiUsageEventWorker,
  ],
  exports: [AiUsageTrackingService, AiUsageTrackingRepository],
})
export class AiUsageTrackingModule {}
