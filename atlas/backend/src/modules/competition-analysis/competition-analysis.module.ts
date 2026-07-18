import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CompetitionAnalysisController } from './competition-analysis.controller';
import { CompetitionAnalysisService } from './competition-analysis.service';
import { CompetitionAnalysisRepository } from './competition-analysis.repository';
import { CompetitionAnalysisQueue, CompetitionAnalysisWorker } from './jobs';
import { AmazonSearchProvider } from './providers';

@Module({
  imports: [DatabaseModule],
  controllers: [CompetitionAnalysisController],
  providers: [
    CompetitionAnalysisService,
    CompetitionAnalysisRepository,
    CompetitionAnalysisQueue,
    CompetitionAnalysisWorker,
    AmazonSearchProvider,
  ],
  exports: [CompetitionAnalysisService],
})
export class CompetitionAnalysisModule {}
