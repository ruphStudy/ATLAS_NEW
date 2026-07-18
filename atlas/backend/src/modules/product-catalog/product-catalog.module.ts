import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ProductCatalogController } from './product-catalog.controller';
import { ProductCatalogService } from './product-catalog.service';
import { ProductCatalogRepository } from './product-catalog.repository';
import { CatalogEventQueue, CatalogEventWorker } from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductCatalogController],
  providers: [
    ProductCatalogService,
    ProductCatalogRepository,
    CatalogEventQueue,
    CatalogEventWorker,
  ],
  exports: [ProductCatalogService],
})
export class ProductCatalogModule {}
