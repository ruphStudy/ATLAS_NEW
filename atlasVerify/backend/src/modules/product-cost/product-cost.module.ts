import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ProductCostController } from './product-cost.controller';
import { ProductCostService } from './product-cost.service';
import { ProductCostRepository } from './product-cost.repository';
import { LandedCostEngine } from './engine/landed-cost.engine';
import { ProductCostQueue, ProductCostWorker } from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductCostController],
  providers: [
    ProductCostService,
    ProductCostRepository,
    LandedCostEngine,
    ProductCostQueue,
    ProductCostWorker,
  ],
  exports: [ProductCostService],
})
export class ProductCostModule {}
