import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiSeoController } from './ai-seo.controller';
import { AiSeoService } from './ai-seo.service';
import { AiSeoRepository } from './ai-seo.repository';
import { SeoAnalysisEngine } from './engine/seo-analysis.engine';
import { SeoOptimizationEngine } from './engine/seo-optimization.engine';
import {
  SeoEventQueue,
  SeoOptimizationQueue,
  SeoEventWorker,
  SeoOptimizationWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [AiSeoController],
  providers: [
    AiSeoService,
    AiSeoRepository,
    SeoAnalysisEngine,
    SeoOptimizationEngine,
    SeoEventQueue,
    SeoOptimizationQueue,
    SeoEventWorker,
    SeoOptimizationWorker,
  ],
  exports: [AiSeoService],
})
export class AiSeoModule {}
