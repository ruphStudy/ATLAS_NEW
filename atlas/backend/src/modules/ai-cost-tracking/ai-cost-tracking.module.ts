import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AiCostTrackingController } from './ai-cost-tracking.controller';
import { AiCostTrackingService } from './ai-cost-tracking.service';
import { AiCostTrackingRepository } from './ai-cost-tracking.repository';
import { AiCostEventQueue, AiCostEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AI_COST_EVENTS,
    }),
  ],
  controllers: [AiCostTrackingController],
  providers: [
    AiCostTrackingService,
    AiCostTrackingRepository,
    AiCostEventQueue,
    AiCostEventWorker,
  ],
  exports: [AiCostTrackingService, AiCostTrackingRepository],
})
export class AiCostTrackingModule {}
