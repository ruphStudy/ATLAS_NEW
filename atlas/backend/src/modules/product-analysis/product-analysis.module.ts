import { Module } from '@nestjs/common';
import { ProductAnalysisController } from './product-analysis.controller';
import { ProductAnalysisService } from './product-analysis.service';
import { ProductAnalysisRepository } from './product-analysis.repository';
import { ProductAnalysisQueue, ProductAnalysisWorker } from './jobs';

@Module({
  controllers: [ProductAnalysisController],
  providers: [
    ProductAnalysisService,
    ProductAnalysisRepository,
    ProductAnalysisQueue,
    ProductAnalysisWorker,
  ],
  exports: [ProductAnalysisService],
})
export class ProductAnalysisModule {}
