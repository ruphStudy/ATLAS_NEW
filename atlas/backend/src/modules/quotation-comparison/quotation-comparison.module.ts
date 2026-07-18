import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { QuotationComparisonController } from './quotation-comparison.controller';
import { QuotationComparisonService } from './quotation-comparison.service';
import { QuotationComparisonRepository } from './quotation-comparison.repository';
import { ComparisonEngine } from './engine/comparison.engine';
import { QuotationComparisonQueue, QuotationComparisonWorker } from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [QuotationComparisonController],
  providers: [
    QuotationComparisonService,
    QuotationComparisonRepository,
    ComparisonEngine,
    QuotationComparisonQueue,
    QuotationComparisonWorker,
  ],
  exports: [QuotationComparisonService],
})
export class QuotationComparisonModule {}
