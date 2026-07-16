import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';

/**
 * InventoryModule
 *
 * Responsibilities:
 *   - Inventory levels per SKU per warehouse
 *   - Reorder point tracking
 *   - Stock movement history
 *   - Low-stock alerts
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryModule {}
