import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ProductScoringController } from './product-scoring.controller';
import { ProductScoringService } from './product-scoring.service';
import { ProductScoringRepository } from './product-scoring.repository';
import { ProductScoringQueue, ProductScoringWorker } from './jobs';
import { ScoringEngine } from './engine';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductScoringController],
  providers: [
    ProductScoringService,
    ProductScoringRepository,
    ProductScoringQueue,
    ProductScoringWorker,
    ScoringEngine,
  ],
  exports: [ProductScoringService],
})
export class ProductScoringModule {}
