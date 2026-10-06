import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { AiRecommendationEngineController } from './ai-recommendation-engine.controller';
import { AiRecommendationEngineService } from './ai-recommendation-engine.service';
import { AiRecommendationEngineRepository } from './ai-recommendation-engine.repository';
import {
  AiRecommendationEventQueue,
  AiRecommendationEventWorker,
} from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'ai-recommendation-events',
    }),
  ],
  controllers: [AiRecommendationEngineController],
  providers: [
    AiRecommendationEngineService,
    AiRecommendationEngineRepository,
    AiRecommendationEventQueue,
    AiRecommendationEventWorker,
  ],
  exports: [AiRecommendationEngineService, AiRecommendationEngineRepository],
})
export class AiRecommendationEngineModule {}
