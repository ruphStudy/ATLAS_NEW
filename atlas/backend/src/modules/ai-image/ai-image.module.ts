import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiImageController } from './ai-image.controller';
import { AiImageService } from './ai-image.service';
import { AiImageRepository } from './ai-image.repository';
import { ImageQualityScoreEngine } from './engine/image-quality-score.engine';
import { AiImageGenerationEngine } from './engine/ai-image-generation.engine';
import {
  AiImageEventQueue,
  AiImageGenerationQueue,
  AiImageEventWorker,
  AiImageGenerationWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [AiImageController],
  providers: [
    AiImageService,
    AiImageRepository,
    ImageQualityScoreEngine,
    AiImageGenerationEngine,
    AiImageEventQueue,
    AiImageGenerationQueue,
    AiImageEventWorker,
    AiImageGenerationWorker,
  ],
  exports: [AiImageService],
})
export class AiImageModule {}
