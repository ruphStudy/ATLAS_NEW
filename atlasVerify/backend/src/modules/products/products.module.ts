import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';

/**
 * ProductsModule
 *
 * Responsibilities:
 *   - Master product catalog management
 *   - Product variants & attributes
 *   - Product media (images, videos)
 *   - SKU management
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
