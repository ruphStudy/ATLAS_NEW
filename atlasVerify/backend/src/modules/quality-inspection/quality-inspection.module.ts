import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { QualityInspectionController } from './quality-inspection.controller';
import { QualityInspectionService } from './quality-inspection.service';
import { QualityInspectionRepository } from './quality-inspection.repository';
import { QualityScoreEngine } from './engine/quality-score.engine';
import { InspectionEventQueue, InspectionEventWorker } from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [QualityInspectionController],
  providers: [
    QualityInspectionService,
    QualityInspectionRepository,
    QualityScoreEngine,
    InspectionEventQueue,
    InspectionEventWorker,
  ],
  exports: [QualityInspectionService],
})
export class QualityInspectionModule {}
