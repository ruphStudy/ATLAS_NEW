import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { WarehouseModule } from '@modules/warehouse/warehouse.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryValidator } from './validator/inventory.validator';
import { InventoryEventQueue, InventoryEventWorker } from './jobs';
import {
  InventoryBatchController,
  InventoryBatchQueryController,
} from './batch/inventory-batch.controller';
import { InventoryBatchService } from './batch/inventory-batch.service';
import { InventoryBatchRepository } from './batch/inventory-batch.repository';
import { InventorySerialController } from './serial/inventory-serial.controller';
import { InventorySerialService } from './serial/inventory-serial.service';
import { InventorySerialRepository } from './serial/inventory-serial.repository';
import { InventoryStockController } from './stock/inventory-stock.controller';
import { InventoryStockService } from './stock/inventory-stock.service';
import { InventoryStockRepository } from './stock/inventory-stock.repository';
import { InventoryReservationController } from './reservation/inventory-reservation.controller';
import { InventoryReservationService } from './reservation/inventory-reservation.service';
import { InventoryReservationRepository } from './reservation/inventory-reservation.repository';
import {
  InventoryReservationExpiryQueue,
  InventoryReservationExpiryWorker,
} from './reservation/jobs';
import { InventoryAllocationController } from './allocation/inventory-allocation.controller';
import { InventoryAllocationService } from './allocation/inventory-allocation.service';
import { InventoryAllocationRepository } from './allocation/inventory-allocation.repository';
import { InventoryAllocationStrategyEngine } from './allocation/inventory-allocation-strategy';
import { InventoryAdjustmentController } from './adjustment/inventory-adjustment.controller';
import { InventoryAdjustmentService } from './adjustment/inventory-adjustment.service';
import { InventoryAdjustmentRepository } from './adjustment/inventory-adjustment.repository';
import { InventoryReconciliationController } from './reconciliation/inventory-reconciliation.controller';
import { InventoryReconciliationService } from './reconciliation/inventory-reconciliation.service';
import { InventoryReconciliationRepository } from './reconciliation/inventory-reconciliation.repository';
import { InventoryCycleCountController } from './cyclecount/inventory-cycle-count.controller';
import { InventoryCycleCountService } from './cyclecount/inventory-cycle-count.service';
import { InventoryCycleCountRepository } from './cyclecount/inventory-cycle-count.repository';
import { InventoryMovementController } from './movement/inventory-movement.controller';
import { InventoryMovementService } from './movement/inventory-movement.service';
import { InventoryMovementRepository } from './movement/inventory-movement.repository';
import { InventoryTransferController } from './transfer/inventory-transfer.controller';
import { InventoryTransferService } from './transfer/inventory-transfer.service';
import { InventoryTransferRepository } from './transfer/inventory-transfer.repository';

/**
 * InventoryModule – Inventory Foundation
 *
 * Responsibilities:
 *   - Inventory master (SKU management, product-catalog mapping, lifecycle)
 *   - Multi-warehouse / multi-location stock ledger (see WarehouseModule)
 *   - Inventory ownership and status (Available, Reserved, Damaged, Lost,
 *     In Transit, Blocked)
 *   - Units of measure and conversions
 *   - Batch/Lot and serial number tracking, expiry
 *   - Inventory configuration and validation
 *   - Inventory events (BullMQ-backed lifecycle/stock event queue)
 */
@Module({
  imports: [DatabaseModule, WarehouseModule],
  controllers: [
    InventoryController,
    InventoryBatchController,
    InventoryBatchQueryController,
    InventorySerialController,
    InventoryStockController,
    InventoryReservationController,
    InventoryAllocationController,
    InventoryAdjustmentController,
    InventoryReconciliationController,
    InventoryCycleCountController,
    InventoryMovementController,
    InventoryTransferController,
  ],
  providers: [
    InventoryService,
    InventoryRepository,
    InventoryValidator,
    InventoryEventQueue,
    InventoryEventWorker,
    InventoryBatchService,
    InventoryBatchRepository,
    InventorySerialService,
    InventorySerialRepository,
    InventoryStockService,
    InventoryStockRepository,
    InventoryReservationService,
    InventoryReservationRepository,
    InventoryReservationExpiryQueue,
    InventoryReservationExpiryWorker,
    InventoryAllocationService,
    InventoryAllocationRepository,
    InventoryAllocationStrategyEngine,
    InventoryAdjustmentService,
    InventoryAdjustmentRepository,
    InventoryReconciliationService,
    InventoryReconciliationRepository,
    InventoryCycleCountService,
    InventoryCycleCountRepository,
    InventoryMovementService,
    InventoryMovementRepository,
    InventoryTransferService,
    InventoryTransferRepository,
  ],
  exports: [
    InventoryService,
    InventoryBatchService,
    InventorySerialService,
    InventoryStockService,
    InventoryRepository,
    InventoryReservationService,
    InventoryAllocationService,
    InventoryAdjustmentService,
    InventoryReconciliationService,
    InventoryTransferService,
    InventoryCycleCountService,
    InventoryMovementService,
  ],
})
export class InventoryModule {}
