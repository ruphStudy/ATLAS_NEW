import { Injectable } from '@nestjs/common';
import { BusinessRuleException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository, StockBucketKey } from './inventory-stock.repository';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import {
  IInventoryConfig,
  InventoryEvent,
  InventoryOwnershipType,
  InventoryStockStatus,
  InventoryTrackingType,
  InventoryTransactionStatus,
  InventoryTransactionType,
} from '../interfaces';
import {
  AdjustStockDto,
  ChangeStockStatusDto,
  DispatchStockDto,
  InventoryStockFilterDto,
  InventoryStockListResponseDto,
  InventoryStockResponseDto,
  InventoryTransactionFilterDto,
  InventoryTransactionListResponseDto,
  InventoryTransactionResponseDto,
  IssueStockDto,
  MoveStockDto,
  ReceiveStockDto,
  ReleaseStockDto,
  ReserveStockDto,
  ReturnStockDto,
  ReverseTransactionDto,
  TransferStockDto,
} from '../dto';
import { INVENTORY_CONSTANTS } from '../constants';

@Injectable()
export class InventoryStockService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly repository: InventoryStockRepository,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findItemOrFail(
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const item = await this.inventoryRepository.findById(inventoryItemId, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', inventoryItemId);
    return item;
  }

  private async bucketOrZero(
    key: StockBucketKey,
    workspaceId: string,
    uom: string,
  ): Promise<Record<string, unknown>> {
    const bucket = await this.repository.findBucket(key, workspaceId);
    return (
      bucket ?? {
        id: null,
        workspaceId,
        inventoryItemId: key.inventoryItemId,
        warehouseId: key.warehouseId,
        locationId: key.locationId ?? null,
        batchId: key.batchId ?? null,
        status: key.status,
        ownershipType: key.ownershipType,
        ownerRef: key.ownerRef ?? null,
        quantity: 0,
        uom,
      }
    );
  }

  private async quantityOf(key: StockBucketKey, workspaceId: string): Promise<number> {
    const bucket = await this.repository.findBucket(key, workspaceId);
    return (bucket?.['quantity'] as number) ?? 0;
  }

  /** Looks up a prior post by idempotency key. Used to make retried requests no-ops. */
  private async findIdempotentReplay(
    workspaceId: string,
    idempotencyKey: string | undefined,
  ): Promise<Record<string, unknown> | null> {
    if (!idempotencyKey) return null;
    return this.repository.findTransactionByIdempotencyKey(workspaceId, idempotencyKey);
  }

  /**
   * Posts an immutable ledger entry and publishes the corresponding event.
   * Ledger rows are append-only: quantity/type/reference facts are never edited
   * after posting — corrections go through `reverse()` instead.
   */
  private async recordTransaction(
    item: Record<string, unknown>,
    workspaceId: string,
    fields: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const transaction = await this.repository.createTransaction({
      inventoryItemId: item['id'],
      workspaceId,
      sku: (item['sku'] as string | null) ?? null,
      catalogProductId: (item['catalogProductId'] as string | null) ?? null,
      variantId: (item['variantId'] as string | null) ?? null,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      status: InventoryTransactionStatus.POSTED,
      uom: INVENTORY_CONSTANTS.DEFAULT_UOM,
      ...fields,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.TRANSACTION_POSTED, {
      transactionId: transaction['id'],
      type: transaction['type'],
    });

    return transaction;
  }

  private async publishEvent(
    item: Record<string, unknown>,
    workspaceId: string,
    event: InventoryEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: item['id'] as string,
      sku: item['sku'] as string,
      workspaceId,
      event,
      metadata,
    });
  }

  // ── Receipt ──────────────────────────────────────────────────

  async receive(
    inventoryItemId: string,
    workspaceId: string,
    dto: ReceiveStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);
    const uom = dto.uom ?? (item['baseUom'] as string);
    const ownershipType = dto.ownershipType ?? InventoryOwnershipType.WORKSPACE;

    const key: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: InventoryStockStatus.AVAILABLE,
      ownershipType,
      ownerRef: dto.ownerRef ?? null,
    };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(key, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);
    this.validator.assertTrackingRequirements(
      item['trackingType'] as InventoryTrackingType,
      config as unknown as IInventoryConfig | null,
      dto.batchId,
      dto.serialId,
    );

    const quantityBefore = await this.quantityOf(key, workspaceId);
    const bucket = await this.repository.adjustBucketQuantity(key, workspaceId, dto.quantity, uom);
    const quantityAfter = quantityBefore + dto.quantity;

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      ownershipType,
      ownerRef: dto.ownerRef ?? null,
      type: InventoryTransactionType.RECEIPT,
      quantity: dto.quantity,
      quantityBefore,
      quantityAfter,
      uom,
      toStatus: InventoryStockStatus.AVAILABLE,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      externalReference: dto.externalReference ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_RECEIVED, {
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(bucket);
  }

  // ── Issue ────────────────────────────────────────────────────

  async issue(
    inventoryItemId: string,
    workspaceId: string,
    dto: IssueStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const ownershipType = dto.ownershipType ?? InventoryOwnershipType.WORKSPACE;
    const fromStatus = dto.fromStockStatus ?? InventoryStockStatus.AVAILABLE;

    const key: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: fromStatus,
      ownershipType,
      ownerRef: dto.ownerRef ?? null,
    };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(key, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);

    const available = await this.quantityOf(key, workspaceId);
    this.validator.assertSufficientStock(
      available,
      dto.quantity,
      (config?.['allowNegativeStock'] as boolean) ?? false,
    );

    const bucket = await this.repository.adjustBucketQuantity(key, workspaceId, -dto.quantity, uom);
    const quantityAfter = available - dto.quantity;

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      ownershipType,
      ownerRef: dto.ownerRef ?? null,
      type: InventoryTransactionType.ISSUE,
      quantity: dto.quantity,
      quantityBefore: available,
      quantityAfter,
      uom,
      fromStatus,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      externalReference: dto.externalReference ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_ISSUED, {
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(bucket);
  }

  // ── Dispatch (goods leaving the warehouse against a shipment) ─

  async dispatch(
    inventoryItemId: string,
    workspaceId: string,
    dto: DispatchStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const fromStatus = dto.fromStockStatus ?? InventoryStockStatus.RESERVED;

    const key: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: fromStatus,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(key, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);

    const available = await this.quantityOf(key, workspaceId);
    this.validator.assertSufficientStock(
      available,
      dto.quantity,
      (config?.['allowNegativeStock'] as boolean) ?? false,
    );

    const bucket = await this.repository.adjustBucketQuantity(key, workspaceId, -dto.quantity, uom);
    const quantityAfter = available - dto.quantity;

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      type: InventoryTransactionType.DISPATCH,
      quantity: dto.quantity,
      quantityBefore: available,
      quantityAfter,
      uom,
      fromStatus,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      externalReference: dto.externalReference ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_DISPATCHED, {
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(bucket);
  }

  // ── Return (goods coming back into the warehouse) ─────────────

  async returnStock(
    inventoryItemId: string,
    workspaceId: string,
    dto: ReturnStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const toStatus = dto.toStockStatus ?? InventoryStockStatus.AVAILABLE;

    const key: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: toStatus,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(key, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);
    this.validator.assertTrackingRequirements(
      item['trackingType'] as InventoryTrackingType,
      config as unknown as IInventoryConfig | null,
      dto.batchId,
      dto.serialId,
    );

    const quantityBefore = await this.quantityOf(key, workspaceId);
    const bucket = await this.repository.adjustBucketQuantity(key, workspaceId, dto.quantity, uom);
    const quantityAfter = quantityBefore + dto.quantity;

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      type: InventoryTransactionType.RETURN,
      quantity: dto.quantity,
      quantityBefore,
      quantityAfter,
      uom,
      toStatus,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      externalReference: dto.externalReference ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_RETURNED, {
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(bucket);
  }

  // ── Transfer ─────────────────────────────────────────────────

  async transfer(
    inventoryItemId: string,
    workspaceId: string,
    dto: TransferStockDto,
    performedBy: string,
  ): Promise<{ from: InventoryStockResponseDto; to: InventoryStockResponseDto }> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const ownershipType = InventoryOwnershipType.WORKSPACE;

    const fromKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.fromWarehouseId,
      locationId: dto.fromLocationId ?? null,
      batchId: dto.batchId ?? null,
      status: InventoryStockStatus.AVAILABLE,
      ownershipType,
      ownerRef: null,
    };
    const toKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.toWarehouseId,
      locationId: dto.toLocationId ?? null,
      batchId: dto.batchId ?? null,
      status: InventoryStockStatus.AVAILABLE,
      ownershipType,
      ownerRef: null,
    };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) {
      return {
        from: InventoryStockResponseDto.from(await this.bucketOrZero(fromKey, workspaceId, uom)),
        to: InventoryStockResponseDto.from(await this.bucketOrZero(toKey, workspaceId, uom)),
      };
    }

    this.validator.assertQuantityPositive(dto.quantity);

    const available = await this.quantityOf(fromKey, workspaceId);
    this.validator.assertSufficientStock(
      available,
      dto.quantity,
      (config?.['allowNegativeStock'] as boolean) ?? false,
    );

    const fromBucket = await this.repository.adjustBucketQuantity(fromKey, workspaceId, -dto.quantity, uom);
    const toBucket = await this.repository.adjustBucketQuantity(toKey, workspaceId, dto.quantity, uom);

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.fromWarehouseId,
      locationId: dto.fromLocationId ?? null,
      batchId: dto.batchId ?? null,
      type: InventoryTransactionType.TRANSFER,
      quantity: dto.quantity,
      quantityBefore: available,
      quantityAfter: available - dto.quantity,
      uom,
      fromStatus: InventoryStockStatus.AVAILABLE,
      toStatus: InventoryStockStatus.AVAILABLE,
      externalReference: dto.externalReference ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
      metadata: { toWarehouseId: dto.toWarehouseId, toLocationId: dto.toLocationId ?? null },
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_TRANSFERRED, {
      fromWarehouseId: dto.fromWarehouseId,
      toWarehouseId: dto.toWarehouseId,
      quantity: dto.quantity,
    });

    return {
      from: InventoryStockResponseDto.from(fromBucket),
      to: InventoryStockResponseDto.from(toBucket),
    };
  }

  // ── Adjustment ───────────────────────────────────────────────

  async adjust(
    inventoryItemId: string,
    workspaceId: string,
    dto: AdjustStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);
    const uom = dto.uom ?? (item['baseUom'] as string);

    const key: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: dto.status,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(key, workspaceId, uom));

    const allowNegativeStock = (config?.['allowNegativeStock'] as boolean) ?? false;
    const adjusted = await this.repository.adjustBucketQuantityAtomic(
      key,
      workspaceId,
      dto.quantityDelta,
      uom,
      allowNegativeStock,
    );

    if (!adjusted.success) {
      this.validator.assertSufficientStock(
        adjusted.quantityBefore,
        Math.abs(dto.quantityDelta),
        allowNegativeStock,
      );
    }

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      type: InventoryTransactionType.ADJUSTMENT,
      quantity: dto.quantityDelta,
      quantityBefore: adjusted.quantityBefore,
      quantityAfter: adjusted.quantityBefore + dto.quantityDelta,
      uom,
      toStatus: dto.status,
      externalReference: dto.externalReference ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_ADJUSTED, {
      warehouseId: dto.warehouseId,
      quantityDelta: dto.quantityDelta,
    });

    return InventoryStockResponseDto.from(adjusted.bucket as Record<string, unknown>);
  }

  // ── Reserve / Release ────────────────────────────────────────

  async reserve(
    inventoryItemId: string,
    workspaceId: string,
    dto: ReserveStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);
    const uom = dto.uom ?? (item['baseUom'] as string);

    const availableKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: InventoryStockStatus.AVAILABLE,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };
    const reservedKey: StockBucketKey = { ...availableKey, status: InventoryStockStatus.RESERVED };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(reservedKey, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);
    this.validator.assertStockTransition(InventoryStockStatus.AVAILABLE, InventoryStockStatus.RESERVED);

    const allowNegativeStock = (config?.['allowNegativeStock'] as boolean) ?? false;
    const moved = await this.repository.moveBucketQuantityAtomic(
      availableKey,
      reservedKey,
      workspaceId,
      dto.quantity,
      uom,
      allowNegativeStock,
    );

    if (!moved.success) {
      this.validator.assertSufficientStock(moved.quantityBefore, dto.quantity, allowNegativeStock);
    }

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      type: InventoryTransactionType.RESERVE,
      quantity: dto.quantity,
      quantityBefore: moved.quantityBefore,
      quantityAfter: moved.quantityBefore - dto.quantity,
      uom,
      fromStatus: InventoryStockStatus.AVAILABLE,
      toStatus: InventoryStockStatus.RESERVED,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_RESERVED, {
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(moved.to as Record<string, unknown>);
  }

  async release(
    inventoryItemId: string,
    workspaceId: string,
    dto: ReleaseStockDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const uom = dto.uom ?? (item['baseUom'] as string);

    const reservedKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: InventoryStockStatus.RESERVED,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };
    const availableKey: StockBucketKey = { ...reservedKey, status: InventoryStockStatus.AVAILABLE };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(availableKey, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);

    const moved = await this.repository.moveBucketQuantityAtomic(
      reservedKey,
      availableKey,
      workspaceId,
      dto.quantity,
      uom,
      false,
    );

    if (!moved.success) {
      this.validator.assertSufficientStock(moved.quantityBefore, dto.quantity, false);
    }

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      type: InventoryTransactionType.RELEASE,
      quantity: dto.quantity,
      quantityBefore: moved.quantityBefore,
      quantityAfter: moved.quantityBefore - dto.quantity,
      uom,
      fromStatus: InventoryStockStatus.RESERVED,
      toStatus: InventoryStockStatus.AVAILABLE,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_RELEASED, {
      warehouseId: dto.warehouseId,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(moved.to as Record<string, unknown>);
  }

  // ── Status Change ────────────────────────────────────────────

  async changeStatus(
    inventoryItemId: string,
    workspaceId: string,
    dto: ChangeStockStatusDto,
    performedBy: string,
  ): Promise<InventoryStockResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const uom = item['baseUom'] as string;

    const fromKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      status: dto.fromStatus,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };
    const toKey: StockBucketKey = { ...fromKey, status: dto.toStatus };

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) return InventoryStockResponseDto.from(await this.bucketOrZero(toKey, workspaceId, uom));

    this.validator.assertQuantityPositive(dto.quantity);
    this.validator.assertStockTransition(dto.fromStatus, dto.toStatus);

    const moved = await this.repository.moveBucketQuantityAtomic(
      fromKey,
      toKey,
      workspaceId,
      dto.quantity,
      uom,
      false,
    );

    if (!moved.success) {
      this.validator.assertSufficientStock(moved.quantityBefore, dto.quantity, false);
    }

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      type: InventoryTransactionType.STATUS_CHANGE,
      quantity: dto.quantity,
      quantityBefore: moved.quantityBefore,
      quantityAfter: moved.quantityBefore - dto.quantity,
      uom,
      fromStatus: dto.fromStatus,
      toStatus: dto.toStatus,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_STATUS_CHANGED, {
      warehouseId: dto.warehouseId,
      fromStatus: dto.fromStatus,
      toStatus: dto.toStatus,
      quantity: dto.quantity,
    });

    return InventoryStockResponseDto.from(moved.to as Record<string, unknown>);
  }

  // ── Move (intra-warehouse location/bin and/or status move) ────

  /**
   * Moves stock between locations/bins and/or statuses within a single
   * warehouse. Recorded as TRANSFER when the location changes (mirroring
   * `transfer()`'s ledger shape, including the `toLocationId` metadata that
   * `reverse()` already knows how to unwind) or STATUS_CHANGE when only the
   * status changes — no new transaction type is needed.
   */
  async move(
    inventoryItemId: string,
    workspaceId: string,
    dto: MoveStockDto,
    performedBy: string,
  ): Promise<{ from: InventoryStockResponseDto; to: InventoryStockResponseDto }> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const config = await this.inventoryRepository.findConfig(inventoryItemId);
    const uom = dto.uom ?? (item['baseUom'] as string);

    const fromKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.fromLocationId ?? null,
      batchId: dto.batchId ?? null,
      status: dto.fromStatus,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };
    const toKey: StockBucketKey = {
      inventoryItemId,
      warehouseId: dto.warehouseId,
      locationId: dto.toLocationId ?? null,
      batchId: dto.batchId ?? null,
      status: dto.toStatus,
      ownershipType: InventoryOwnershipType.WORKSPACE,
      ownerRef: null,
    };
    const locationChanged = (dto.fromLocationId ?? null) !== (dto.toLocationId ?? null);

    const replay = await this.findIdempotentReplay(workspaceId, dto.idempotencyKey);
    if (replay) {
      return {
        from: InventoryStockResponseDto.from(await this.bucketOrZero(fromKey, workspaceId, uom)),
        to: InventoryStockResponseDto.from(await this.bucketOrZero(toKey, workspaceId, uom)),
      };
    }

    this.validator.assertQuantityPositive(dto.quantity);
    if (dto.fromStatus !== dto.toStatus) {
      this.validator.assertStockTransition(dto.fromStatus, dto.toStatus);
    }

    const allowNegativeStock = (config?.['allowNegativeStock'] as boolean) ?? false;
    const moved = await this.repository.moveBucketQuantityAtomic(
      fromKey,
      toKey,
      workspaceId,
      dto.quantity,
      uom,
      allowNegativeStock,
    );

    if (!moved.success) {
      this.validator.assertSufficientStock(moved.quantityBefore, dto.quantity, allowNegativeStock);
    }

    await this.recordTransaction(item, workspaceId, {
      warehouseId: dto.warehouseId,
      locationId: dto.fromLocationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      type: locationChanged ? InventoryTransactionType.TRANSFER : InventoryTransactionType.STATUS_CHANGE,
      quantity: dto.quantity,
      quantityBefore: moved.quantityBefore,
      quantityAfter: moved.quantityBefore - dto.quantity,
      uom,
      fromStatus: dto.fromStatus,
      toStatus: dto.toStatus,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      reason: dto.reason ?? null,
      performedBy,
      ...(locationChanged && {
        metadata: { toWarehouseId: dto.warehouseId, toLocationId: dto.toLocationId ?? null },
      }),
    });

    await this.publishEvent(item, workspaceId, InventoryEvent.STOCK_MOVED, {
      warehouseId: dto.warehouseId,
      fromLocationId: dto.fromLocationId ?? null,
      toLocationId: dto.toLocationId ?? null,
      fromStatus: dto.fromStatus,
      toStatus: dto.toStatus,
      quantity: dto.quantity,
    });

    return {
      from: InventoryStockResponseDto.from(moved.from as Record<string, unknown>),
      to: InventoryStockResponseDto.from(moved.to as Record<string, unknown>),
    };
  }

  // ── Reversal ─────────────────────────────────────────────────

  /**
   * Posts a compensating transaction that undoes a prior post, and marks the
   * original as REVERSED. The original row's quantity/type/reference facts are
   * never edited — this is the only sanctioned way to correct a posted entry.
   */
  async reverse(
    inventoryItemId: string,
    workspaceId: string,
    transactionId: string,
    dto: ReverseTransactionDto,
    performedBy: string,
  ): Promise<InventoryTransactionResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);

    const original = await this.repository.findTransactionById(transactionId, workspaceId);
    if (!original || original['inventoryItemId'] !== inventoryItemId) {
      throw new ResourceNotFoundException('Inventory transaction', transactionId);
    }

    if (original['status'] === InventoryTransactionStatus.REVERSED) {
      throw new BusinessRuleException(
        'Transaction has already been reversed',
        ErrorCode.INVENTORY_TRANSACTION_ALREADY_REVERSED,
      );
    }

    const type = original['type'] as InventoryTransactionType;
    if (!INVENTORY_CONSTANTS.REVERSIBLE_TRANSACTION_TYPES.includes(type)) {
      throw new BusinessRuleException(
        `Transactions of type ${type} are not reversible`,
        ErrorCode.INVENTORY_TRANSACTION_NOT_REVERSIBLE,
      );
    }

    const warehouseId = original['warehouseId'] as string;
    const locationId = (original['locationId'] as string | null) ?? null;
    const batchId = (original['batchId'] as string | null) ?? null;
    const ownershipType = original['ownershipType'] as InventoryOwnershipType;
    const ownerRef = (original['ownerRef'] as string | null) ?? null;
    const uom = original['uom'] as string;
    const qty = original['quantity'] as number;
    const fromStatus = original['fromStatus'] as InventoryStockStatus | null;
    const toStatus = original['toStatus'] as InventoryStockStatus | null;
    const metadata = (original['metadata'] as Record<string, unknown> | null) ?? {};

    const baseKey = {
      inventoryItemId,
      warehouseId,
      locationId,
      batchId,
      ownershipType,
      ownerRef,
    };

    switch (type) {
      case InventoryTransactionType.RECEIPT:
      case InventoryTransactionType.RETURN:
        await this.repository.adjustBucketQuantity(
          { ...baseKey, status: toStatus ?? InventoryStockStatus.AVAILABLE },
          workspaceId,
          -qty,
          uom,
        );
        break;

      case InventoryTransactionType.ISSUE:
      case InventoryTransactionType.DISPATCH:
        await this.repository.adjustBucketQuantity(
          { ...baseKey, status: fromStatus ?? InventoryStockStatus.AVAILABLE },
          workspaceId,
          qty,
          uom,
        );
        break;

      case InventoryTransactionType.ADJUSTMENT:
        await this.repository.adjustBucketQuantity(
          { ...baseKey, status: toStatus ?? InventoryStockStatus.AVAILABLE },
          workspaceId,
          -qty,
          uom,
        );
        break;

      case InventoryTransactionType.RESERVE:
      case InventoryTransactionType.RELEASE:
      case InventoryTransactionType.STATUS_CHANGE:
        await this.repository.adjustBucketQuantity(
          { ...baseKey, status: fromStatus ?? InventoryStockStatus.AVAILABLE },
          workspaceId,
          qty,
          uom,
        );
        await this.repository.adjustBucketQuantity(
          { ...baseKey, status: toStatus ?? InventoryStockStatus.AVAILABLE },
          workspaceId,
          -qty,
          uom,
        );
        break;

      case InventoryTransactionType.TRANSFER: {
        const toWarehouseId = metadata['toWarehouseId'] as string | undefined;
        const toLocationId = (metadata['toLocationId'] as string | null | undefined) ?? null;
        await this.repository.adjustBucketQuantity(
          { ...baseKey, status: fromStatus ?? InventoryStockStatus.AVAILABLE },
          workspaceId,
          qty,
          uom,
        );
        if (toWarehouseId) {
          await this.repository.adjustBucketQuantity(
            {
              inventoryItemId,
              warehouseId: toWarehouseId,
              locationId: toLocationId,
              batchId,
              status: toStatus ?? InventoryStockStatus.AVAILABLE,
              ownershipType,
              ownerRef,
            },
            workspaceId,
            -qty,
            uom,
          );
        }
        break;
      }

      default:
        throw new BusinessRuleException(
          `Transactions of type ${type} are not reversible`,
          ErrorCode.INVENTORY_TRANSACTION_NOT_REVERSIBLE,
        );
    }

    const reversal = await this.recordTransaction(item, workspaceId, {
      warehouseId,
      locationId,
      batchId,
      ownershipType,
      ownerRef,
      type: InventoryTransactionType.REVERSAL,
      quantity: -qty,
      uom,
      fromStatus: toStatus,
      toStatus: fromStatus,
      referenceType: 'inventory_transaction',
      referenceId: original['id'] as string,
      reason: dto.reason,
      performedBy,
      metadata: { reversalOfId: original['id'] },
    });

    await this.repository.markTransactionReversed(original['id'] as string);

    await this.publishEvent(item, workspaceId, InventoryEvent.TRANSACTION_REVERSED, {
      transactionId: original['id'],
      reversalId: reversal['id'],
    });

    return InventoryTransactionResponseDto.from(reversal);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventoryStockFilterDto,
  ): Promise<InventoryStockListResponseDto> {
    await this.findItemOrFail(inventoryItemId, workspaceId);
    const [items, total] = await this.repository.findAll(inventoryItemId, workspaceId, filter);
    return InventoryStockListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async getOnHandSummary(
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<InventoryStockStatus, number>> {
    await this.findItemOrFail(inventoryItemId, workspaceId);
    const grouped = await this.repository.getOnHandSummary(inventoryItemId, workspaceId);

    const summary = Object.values(InventoryStockStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<InventoryStockStatus, number>,
    );

    for (const entry of grouped) {
      summary[entry.status] = entry.quantity;
    }

    return summary;
  }

  async findTransactions(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventoryTransactionFilterDto,
  ): Promise<InventoryTransactionListResponseDto> {
    await this.findItemOrFail(inventoryItemId, workspaceId);
    const [items, total] = await this.repository.findTransactions(inventoryItemId, workspaceId, filter);
    return InventoryTransactionListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findTransactionById(
    inventoryItemId: string,
    workspaceId: string,
    transactionId: string,
  ): Promise<InventoryTransactionResponseDto> {
    await this.findItemOrFail(inventoryItemId, workspaceId);
    const transaction = await this.repository.findTransactionById(transactionId, workspaceId);
    if (!transaction || transaction['inventoryItemId'] !== inventoryItemId) {
      throw new ResourceNotFoundException('Inventory transaction', transactionId);
    }
    return InventoryTransactionResponseDto.from(transaction);
  }
}
