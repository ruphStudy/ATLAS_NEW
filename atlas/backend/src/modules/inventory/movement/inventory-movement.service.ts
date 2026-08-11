import { Injectable } from '@nestjs/common';
import { BusinessRuleException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseLocationService } from '@modules/warehouse/warehouse-location.service';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryStockService } from '../stock/inventory-stock.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryMovementRepository } from './inventory-movement.repository';
import {
  InventoryEvent,
  InventoryMovementStatus,
  InventoryOwnershipType,
  InventoryStockStatus,
} from '../interfaces';
import {
  ApproveMovementDto,
  CancelMovementDto,
  CreateMovementDto,
  ExecuteMovementDto,
  InventoryMovementFilterDto,
  InventoryMovementHistoryResponseDto,
  InventoryMovementListResponseDto,
  InventoryMovementResponseDto,
  ReverseMovementDto,
} from '../dto';

@Injectable()
export class InventoryMovementService {
  constructor(
    private readonly repository: InventoryMovementRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly stockService: InventoryStockService,
    private readonly warehouseLocationService: WarehouseLocationService,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory movement', id);
    return record;
  }

  private async recordHistory(
    movementId: string,
    workspaceId: string,
    fromStatus: InventoryMovementStatus | null,
    toStatus: InventoryMovementStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({ movementId, workspaceId, fromStatus, toStatus, reason, changedBy });
  }

  private async publishEvent(
    item: Record<string, unknown> | null,
    workspaceId: string,
    event: InventoryEvent,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: (item?.['id'] as string) ?? 'movement',
      sku: (item?.['sku'] as string) ?? 'MOVEMENT',
      workspaceId,
      event,
      metadata,
    });
  }

  /**
   * Validates the destination bucket won't exceed the location's configured
   * capacity. Reuses `WarehouseLocation.metadata['maxCapacity']` (the existing
   * flexible-JSON convention already used elsewhere for per-location config)
   * rather than introducing a new capacity column — locations without it set
   * are treated as uncapped.
   */
  private async assertDestinationCapacity(
    workspaceId: string,
    inventoryItemId: string,
    warehouseId: string,
    toLocationId: string | undefined,
    toStatus: InventoryStockStatus,
    batchId: string | undefined,
    quantity: number,
  ): Promise<void> {
    if (!toLocationId) return;

    const location = await this.warehouseLocationService.findById(toLocationId, warehouseId, workspaceId);

    const metadata = location.metadata ?? {};
    const maxCapacity = typeof metadata['maxCapacity'] === 'number' ? (metadata['maxCapacity'] as number) : null;
    if (maxCapacity == null) return;

    const bucket = await this.stockRepository.findBucket(
      {
        inventoryItemId,
        warehouseId,
        locationId: toLocationId,
        batchId: batchId ?? null,
        status: toStatus,
        ownershipType: InventoryOwnershipType.WORKSPACE,
        ownerRef: null,
      },
      workspaceId,
    );
    const currentQuantity = (bucket?.['quantity'] as number) ?? 0;

    if (currentQuantity + quantity > maxCapacity) {
      throw new BusinessRuleException(
        `Destination location capacity exceeded: ${currentQuantity + quantity} would exceed max capacity ${maxCapacity}`,
        ErrorCode.INVENTORY_MOVEMENT_CAPACITY_EXCEEDED,
      );
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateMovementDto,
    createdBy: string,
  ): Promise<InventoryMovementResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) return InventoryMovementResponseDto.from(existing);
    }

    const item = await this.inventoryRepository.findById(dto.inventoryItemId, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', dto.inventoryItemId);

    this.validator.assertQuantityPositive(dto.quantity);

    const fromLocationId = dto.fromLocationId ?? null;
    const toLocationId = dto.toLocationId ?? null;
    if (fromLocationId === toLocationId && dto.fromStatus === dto.toStatus) {
      throw new BusinessRuleException(
        'A movement must change either the location or the status',
        ErrorCode.INVENTORY_MOVEMENT_NO_OP,
      );
    }

    if (dto.fromStatus !== dto.toStatus) {
      this.validator.assertStockTransition(dto.fromStatus, dto.toStatus);
    }

    if (toLocationId) {
      await this.warehouseLocationService.findById(toLocationId, dto.warehouseId, workspaceId);
    }
    if (fromLocationId) {
      await this.warehouseLocationService.findById(fromLocationId, dto.warehouseId, workspaceId);
    }

    const movement = await this.repository.create({
      workspaceId,
      inventoryItemId: dto.inventoryItemId,
      sku: (item['sku'] as string | null) ?? null,
      catalogProductId: (item['catalogProductId'] as string | null) ?? null,
      variantId: (item['variantId'] as string | null) ?? null,
      warehouseId: dto.warehouseId,
      fromLocationId,
      toLocationId,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      fromStatus: dto.fromStatus,
      toStatus: dto.toStatus,
      quantity: dto.quantity,
      uom: dto.uom ?? (item['baseUom'] as string),
      status: InventoryMovementStatus.PENDING_APPROVAL,
      reason: dto.reason,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      notes: dto.notes ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
    });

    const id = movement['id'] as string;
    await this.recordHistory(id, workspaceId, null, InventoryMovementStatus.PENDING_APPROVAL, 'Movement requested', createdBy);
    await this.publishEvent(item, workspaceId, InventoryEvent.MOVEMENT_CREATED, { movementId: id });

    return InventoryMovementResponseDto.from(movement);
  }

  // ── Approve / Cancel ─────────────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveMovementDto,
    userId: string,
  ): Promise<InventoryMovementResponseDto> {
    const movement = await this.findOrFail(id, workspaceId);
    const status = movement['status'] as InventoryMovementStatus;
    this.validator.assertMovementTransition(status, InventoryMovementStatus.APPROVED);

    const updated = await this.repository.update(id, {
      status: InventoryMovementStatus.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.recordHistory(id, workspaceId, status, InventoryMovementStatus.APPROVED, dto.notes ?? 'Movement approved', userId);
    const item = await this.inventoryRepository.findById(movement['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(item, workspaceId, InventoryEvent.MOVEMENT_APPROVED, { movementId: id });

    return InventoryMovementResponseDto.from(updated);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelMovementDto,
    userId: string,
  ): Promise<InventoryMovementResponseDto> {
    const movement = await this.findOrFail(id, workspaceId);
    const status = movement['status'] as InventoryMovementStatus;
    this.validator.assertMovementTransition(status, InventoryMovementStatus.CANCELLED);

    const updated = await this.repository.update(id, { status: InventoryMovementStatus.CANCELLED });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryMovementStatus.CANCELLED,
      dto.reason ?? 'Movement cancelled',
      userId,
    );
    const item = await this.inventoryRepository.findById(movement['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(item, workspaceId, InventoryEvent.MOVEMENT_CANCELLED, { movementId: id });

    return InventoryMovementResponseDto.from(updated);
  }

  // ── Execute ──────────────────────────────────────────────────

  async execute(
    id: string,
    workspaceId: string,
    dto: ExecuteMovementDto,
    userId: string,
  ): Promise<InventoryMovementResponseDto> {
    const movement = await this.findOrFail(id, workspaceId);
    const status = movement['status'] as InventoryMovementStatus;
    this.validator.assertMovementTransition(status, InventoryMovementStatus.EXECUTED);

    const item = await this.inventoryRepository.findById(movement['inventoryItemId'] as string, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', movement['inventoryItemId'] as string);

    const warehouseId = movement['warehouseId'] as string;
    const fromLocationId = (movement['fromLocationId'] as string | null) ?? undefined;
    const toLocationId = (movement['toLocationId'] as string | null) ?? undefined;
    const batchId = (movement['batchId'] as string | null) ?? undefined;
    const quantity = movement['quantity'] as number;
    const fromStatus = movement['fromStatus'] as InventoryStockStatus;
    const toStatus = movement['toStatus'] as InventoryStockStatus;

    const sourceBucket = await this.stockRepository.findBucket(
      {
        inventoryItemId: movement['inventoryItemId'] as string,
        warehouseId,
        locationId: fromLocationId ?? null,
        batchId: batchId ?? null,
        status: fromStatus,
        ownershipType: InventoryOwnershipType.WORKSPACE,
        ownerRef: null,
      },
      workspaceId,
    );
    this.validator.assertSufficientStock((sourceBucket?.['quantity'] as number) ?? 0, quantity, false);

    await this.assertDestinationCapacity(
      workspaceId,
      movement['inventoryItemId'] as string,
      warehouseId,
      toLocationId,
      toStatus,
      batchId,
      quantity,
    );

    const movementKey = `movement:${id}`;
    await this.stockService.move(
      movement['inventoryItemId'] as string,
      workspaceId,
      {
        warehouseId,
        fromLocationId,
        toLocationId,
        batchId,
        serialId: (movement['serialId'] as string | null) ?? undefined,
        fromStatus,
        toStatus,
        quantity,
        uom: movement['uom'] as string,
        referenceType: (movement['referenceType'] as string | null) ?? undefined,
        referenceId: (movement['referenceId'] as string | null) ?? undefined,
        reason: movement['reason'] as string,
        idempotencyKey: movementKey,
      },
      userId,
    );

    const transaction = await this.stockRepository.findTransactionByIdempotencyKey(workspaceId, movementKey);

    const updated = await this.repository.update(id, {
      status: InventoryMovementStatus.EXECUTED,
      transactionId: (transaction?.['id'] as string | null) ?? null,
      executedBy: userId,
      executedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryMovementStatus.EXECUTED,
      dto.notes ?? 'Movement executed',
      userId,
    );
    await this.publishEvent(item, workspaceId, InventoryEvent.MOVEMENT_EXECUTED, {
      movementId: id,
      transactionId: transaction?.['id'] ?? null,
    });

    return InventoryMovementResponseDto.from(updated);
  }

  // ── Reverse ──────────────────────────────────────────────────

  async reverse(
    id: string,
    workspaceId: string,
    dto: ReverseMovementDto,
    userId: string,
  ): Promise<InventoryMovementResponseDto> {
    const movement = await this.findOrFail(id, workspaceId);
    const status = movement['status'] as InventoryMovementStatus;
    this.validator.assertMovementTransition(status, InventoryMovementStatus.REVERSED);

    const transactionId = movement['transactionId'] as string | null;
    if (!transactionId) {
      throw new BusinessRuleException(
        'Movement has no executed transaction to reverse',
        ErrorCode.INVENTORY_MOVEMENT_INVALID_STATUS_TRANSITION,
      );
    }

    await this.stockService.reverse(
      movement['inventoryItemId'] as string,
      workspaceId,
      transactionId,
      { reason: dto.reason },
      userId,
    );

    const updated = await this.repository.update(id, {
      status: InventoryMovementStatus.REVERSED,
      reversedBy: userId,
      reversedAt: new Date(),
    });

    await this.recordHistory(id, workspaceId, status, InventoryMovementStatus.REVERSED, dto.reason, userId);
    const item = await this.inventoryRepository.findById(movement['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(item, workspaceId, InventoryEvent.MOVEMENT_REVERSED, { movementId: id, transactionId });

    return InventoryMovementResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryMovementFilterDto,
  ): Promise<InventoryMovementListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryMovementListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryMovementResponseDto> {
    const movement = await this.findOrFail(id, workspaceId);
    return InventoryMovementResponseDto.from(movement);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryMovementHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryMovementHistoryResponseDto.from);
  }
}
