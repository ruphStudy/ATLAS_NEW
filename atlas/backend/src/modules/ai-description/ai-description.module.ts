import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiDescriptionController } from './ai-description.controller';
import { AiDescriptionService } from './ai-description.service';
import { AiDescriptionRepository } from './ai-description.repository';
import { AiQualityScoreEngine } from './engine/ai-quality-score.engine';
import { AiGenerationEngine } from './engine/ai-generation.engine';
import {
  AiDescriptionEventQueue,
  AiGenerationQueue,
  AiDescriptionEventWorker,
  AiGenerationWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [AiDescriptionController],
  providers: [
    AiDescriptionService,
    AiDescriptionRepository,
    AiQualityScoreEngine,
    AiGenerationEngine,
    AiDescriptionEventQueue,
    AiGenerationQueue,
    AiDescriptionEventWorker,
    AiGenerationWorker,
  ],
  exports: [AiDescriptionService],
})
export class AiDescriptionModule {}
