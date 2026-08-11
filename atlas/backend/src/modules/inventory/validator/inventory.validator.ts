import { Injectable } from '@nestjs/common';
import { BusinessRuleException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import {
  IInventoryConfig,
  InventoryAdjustmentStatus,
  InventoryAllocationStatus,
  InventoryCycleCountLineStatus,
  InventoryCycleCountStatus,
  InventoryItemStatus,
  InventoryMovementStatus,
  InventoryReconciliationFindingStatus,
  InventoryReconciliationStatus,
  InventoryReservationStatus,
  InventoryStockStatus,
  InventoryTrackingType,
} from '../interfaces';
import { INVENTORY_CONSTANTS } from '../constants';

@Injectable()
export class InventoryValidator {
  assertItemTransition(current: InventoryItemStatus, next: InventoryItemStatus): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition inventory item from ${current} to ${next}`,
        ErrorCode.INVENTORY_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertStockTransition(current: InventoryStockStatus, next: InventoryStockStatus): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_STOCK_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition stock from ${current} to ${next}`,
        ErrorCode.INVENTORY_INVALID_STOCK_STATUS_TRANSITION,
      );
    }
  }

  assertSufficientStock(available: number, requested: number, allowNegativeStock = false): void {
    if (!allowNegativeStock && requested > available) {
      throw new BusinessRuleException(
        `Insufficient stock: requested ${requested}, available ${available}`,
        ErrorCode.INVENTORY_INSUFFICIENT_STOCK,
      );
    }
  }

  assertTrackingRequirements(
    trackingType: InventoryTrackingType,
    config: IInventoryConfig | null,
    batchId?: string | null,
    serialId?: string | null,
  ): void {
    if (
      (trackingType === InventoryTrackingType.BATCH || config?.requiresBatchOnReceipt) &&
      !batchId
    ) {
      throw new BusinessRuleException(
        'A batch/lot reference is required for this inventory item',
        ErrorCode.INVENTORY_BATCH_REQUIRED,
      );
    }

    if (
      (trackingType === InventoryTrackingType.SERIAL || config?.requiresSerialOnReceipt) &&
      !serialId
    ) {
      throw new BusinessRuleException(
        'A serial number reference is required for this inventory item',
        ErrorCode.INVENTORY_SERIAL_REQUIRED,
      );
    }
  }

  assertQuantityPositive(quantity: number): void {
    if (quantity <= 0) {
      throw new BusinessRuleException(
        'Quantity must be greater than zero',
        ErrorCode.VALIDATION_FAILED,
      );
    }
  }

  assertReservationTransition(
    current: InventoryReservationStatus,
    next: InventoryReservationStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_RESERVATION_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition reservation from ${current} to ${next}`,
        ErrorCode.INVENTORY_RESERVATION_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertAllocationTransition(
    current: InventoryAllocationStatus,
    next: InventoryAllocationStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_ALLOCATION_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition allocation from ${current} to ${next}`,
        ErrorCode.INVENTORY_ALLOCATION_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertAdjustmentTransition(
    current: InventoryAdjustmentStatus,
    next: InventoryAdjustmentStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_ADJUSTMENT_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition adjustment from ${current} to ${next}`,
        ErrorCode.INVENTORY_ADJUSTMENT_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertReconciliationRunTransition(
    current: InventoryReconciliationStatus,
    next: InventoryReconciliationStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_RECONCILIATION_RUN_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition reconciliation run from ${current} to ${next}`,
        ErrorCode.INVENTORY_RECONCILIATION_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertReconciliationFindingTransition(
    current: InventoryReconciliationFindingStatus,
    next: InventoryReconciliationFindingStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_RECONCILIATION_FINDING_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition reconciliation finding from ${current} to ${next}`,
        ErrorCode.INVENTORY_RECONCILIATION_INVALID_FINDING_TRANSITION,
      );
    }
  }

  assertCycleCountTransition(
    current: InventoryCycleCountStatus,
    next: InventoryCycleCountStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_CYCLE_COUNT_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition cycle count from ${current} to ${next}`,
        ErrorCode.INVENTORY_CYCLE_COUNT_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertCycleCountLineTransition(
    current: InventoryCycleCountLineStatus,
    next: InventoryCycleCountLineStatus,
  ): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_CYCLE_COUNT_LINE_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition cycle count line from ${current} to ${next}`,
        ErrorCode.INVENTORY_CYCLE_COUNT_INVALID_STATUS_TRANSITION,
      );
    }
  }

  assertMovementTransition(current: InventoryMovementStatus, next: InventoryMovementStatus): void {
    const allowed = INVENTORY_CONSTANTS.ALLOWED_MOVEMENT_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition movement from ${current} to ${next}`,
        ErrorCode.INVENTORY_MOVEMENT_INVALID_STATUS_TRANSITION,
      );
    }
  }
}
