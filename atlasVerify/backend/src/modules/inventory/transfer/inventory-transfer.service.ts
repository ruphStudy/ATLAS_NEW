import { Injectable } from '@nestjs/common';
import { BusinessRuleException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseService } from '@modules/warehouse/warehouse.service';
import { WarehouseLocationService } from '@modules/warehouse/warehouse-location.service';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryStockService } from '../stock/inventory-stock.service';
import { InventoryReservationService } from '../reservation/inventory-reservation.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryTransferRepository } from './inventory-transfer.repository';
import {
  InventoryEvent,
  InventoryTransferStatus,
  InventoryTransferLineStatus,
  InventoryStockStatus,
  InventoryOwnershipType,
  InventoryReservationSource,
  InventoryTransactionType,
} from '../interfaces';
import {
  CreateTransferDto,
  ApproveTransferDto,
  DispatchTransferDto,
  ReceiveTransferDto,
  CancelTransferDto,
  ReverseTransferDto,
  InventoryTransferFilterDto,
  InventoryTransferResponseDto,
  InventoryTransferListResponseDto,
  InventoryTransferHistoryResponseDto,
} from '../dto';
import { INVENTORY_CONSTANTS } from '../constants';

@Injectable()
export class InventoryTransferService {
  constructor(
    private readonly repository: InventoryTransferRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly stockService: InventoryStockService,
    private readonly reservationService: InventoryReservationService,
    private readonly warehouseService: WarehouseService,
    private readonly warehouseLocationService: WarehouseLocationService,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory transfer', id);
    return record;
  }

  private async recordHistory(
    transferId: string,
    workspaceId: string,
    fromStatus: InventoryTransferStatus | null,
    toStatus: InventoryTransferStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({ transferId, workspaceId, fromStatus, toStatus, reason, changedBy });
  }

  private async publishEvent(
    workspaceId: string,
    event: InventoryEvent,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: 'transfer',
      sku: 'TRANSFER',
      workspaceId,
      event,
      metadata,
    });
  }

  private assertTransferTransition(from: InventoryTransferStatus, to: InventoryTransferStatus): void {
    const allowed: Record<InventoryTransferStatus, InventoryTransferStatus[]> = {
      [InventoryTransferStatus.PENDING]: [InventoryTransferStatus.APPROVED, InventoryTransferStatus.CANCELLED],
      [InventoryTransferStatus.APPROVED]: [InventoryTransferStatus.DISPATCHED, InventoryTransferStatus.CANCELLED],
      [InventoryTransferStatus.DISPATCHED]: [InventoryTransferStatus.IN_TRANSIT],
      [InventoryTransferStatus.IN_TRANSIT]: [
        InventoryTransferStatus.RECEIVED,
        InventoryTransferStatus.PARTIALLY_RECEIVED,
      ],
      [InventoryTransferStatus.PARTIALLY_RECEIVED]: [
        InventoryTransferStatus.RECEIVED,
        InventoryTransferStatus.PARTIALLY_RECEIVED,
      ],
      [InventoryTransferStatus.RECEIVED]: [InventoryTransferStatus.REVERSED],
      [InventoryTransferStatus.PARTIALLY_RECEIVED]: [InventoryTransferStatus.REVERSED],
      [InventoryTransferStatus.CANCELLED]: [],
      [InventoryTransferStatus.REVERSED]: [],
    };

    if (!allowed[from]?.includes(to)) {
      throw new BusinessRuleException(
        `Invalid transfer status transition: ${from} → ${to}`,
        ErrorCode.INVENTORY_TRANSFER_INVALID_STATUS_TRANSITION,
      );
    }
  }

  private async assertDestinationCapacity(
    workspaceId: string,
    inventoryItemId: string,
    destinationWarehouseId: string,
    destinationLocationId: string | undefined,
    quantity: number,
  ): Promise<void> {
    if (!destinationLocationId) return;

    const location = await this.warehouseLocationService.findById(
      destinationLocationId,
      destinationWarehouseId,
      workspaceId,
    );

    const metadata = location.metadata ?? {};
    const maxCapacity = typeof metadata['maxCapacity'] === 'number' ? (metadata['maxCapacity'] as number) : null;
    if (maxCapacity == null) return;

    const bucket = await this.stockRepository.findBucket(
      {
        inventoryItemId,
        warehouseId: destinationWarehouseId,
        locationId: destinationLocationId,
        batchId: null,
        status: InventoryStockStatus.AVAILABLE,
        ownershipType: InventoryOwnershipType.WORKSPACE,
        ownerRef: null,
      },
      workspaceId,
    );
    const currentQuantity = (bucket?.['quantity'] as number) ?? 0;

    if (currentQuantity + quantity > maxCapacity) {
      throw new BusinessRuleException(
        `Destination location capacity exceeded: ${currentQuantity + quantity} would exceed max capacity ${maxCapacity}`,
        ErrorCode.INVENTORY_TRANSFER_CAPACITY_EXCEEDED,
      );
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateTransferDto,
    createdBy: string,
  ): Promise<InventoryTransferResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) return InventoryTransferResponseDto.from(existing);
    }

    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BusinessRuleException(
        'Source and destination warehouses must be different',
        ErrorCode.INVENTORY_TRANSFER_SAME_WAREHOUSE,
      );
    }

    await this.warehouseService.findById(dto.sourceWarehouseId, workspaceId);
    await this.warehouseService.findById(dto.destinationWarehouseId, workspaceId);

    if (dto.lines.length === 0) {
      throw new BusinessRuleException('Transfer must have at least one line', ErrorCode.INVALID_INPUT);
    }

    const transferNumber = await this.repository.generateTransferNumber(workspaceId);

    const lines = [];
    for (const lineDto of dto.lines) {
      const item = await this.inventoryRepository.findById(lineDto.inventoryItemId, workspaceId);
      if (!item) throw new ResourceNotFoundException('Inventory item', lineDto.inventoryItemId);

      this.validator.assertQuantityPositive(lineDto.quantity);

      if (lineDto.sourceLocationId) {
        await this.warehouseLocationService.findById(
          lineDto.sourceLocationId,
          dto.sourceWarehouseId,
          workspaceId,
        );
      }
      if (lineDto.destinationLocationId) {
        await this.warehouseLocationService.findById(
          lineDto.destinationLocationId,
          dto.destinationWarehouseId,
          workspaceId,
        );
      }

      lines.push({
        workspaceId,
        inventoryItemId: lineDto.inventoryItemId,
        sku: (item['sku'] as string | null) ?? null,
        catalogProductId: (item['catalogProductId'] as string | null) ?? null,
        variantId: (item['variantId'] as string | null) ?? null,
        batchId: lineDto.batchId ?? null,
        serialId: lineDto.serialId ?? null,
        requestedQuantity: lineDto.quantity,
        dispatchedQuantity: 0,
        receivedQuantity: 0,
        damagedQuantity: 0,
        uom: lineDto.uom ?? (item['baseUom'] as string),
        status: InventoryTransferLineStatus.PENDING,
        sourceLocationId: lineDto.sourceLocationId ?? null,
        destinationLocationId: lineDto.destinationLocationId ?? null,
        metadata: lineDto.metadata ?? {},
      });
    }

    const transfer = await this.repository.create({
      workspaceId,
      transferNumber,
      sourceWarehouseId: dto.sourceWarehouseId,
      destinationWarehouseId: dto.destinationWarehouseId,
      status: InventoryTransferStatus.PENDING,
      reason: dto.reason,
      referenceType: dto.referenceType ?? null,
      referenceId: dto.referenceId ?? null,
      shipmentReference: dto.shipmentReference ?? null,
      notes: dto.notes ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
      lines: { create: lines },
    });

    const id = transfer['id'] as string;
    await this.recordHistory(id, workspaceId, null, InventoryTransferStatus.PENDING, 'Transfer created', createdBy);
    await this.publishEvent(workspaceId, InventoryEvent.TRANSFER_CREATED, { transferId: id });

    return InventoryTransferResponseDto.from(transfer);
  }

  // ── Approve ──────────────────────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveTransferDto,
    userId: string,
  ): Promise<InventoryTransferResponseDto> {
    const transfer = await this.findOrFail(id, workspaceId);
    const status = transfer['status'] as InventoryTransferStatus;
    this.assertTransferTransition(status, InventoryTransferStatus.APPROVED);

    const updated = await this.repository.update(id, {
      status: InventoryTransferStatus.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryTransferStatus.APPROVED,
      dto.notes ?? 'Transfer approved',
      userId,
    );
    await this.publishEvent(workspaceId, InventoryEvent.TRANSFER_APPROVED, { transferId: id });

    return InventoryTransferResponseDto.from(updated);
  }

  // ── Dispatch ─────────────────────────────────────────────────

  async dispatch(
    id: string,
    workspaceId: string,
    dto: DispatchTransferDto,
    userId: string,
  ): Promise<InventoryTransferResponseDto> {
    const transfer = await this.findOrFail(id, workspaceId);
    const status = transfer['status'] as InventoryTransferStatus;
    this.assertTransferTransition(status, InventoryTransferStatus.DISPATCHED);

    const lines = transfer['lines'] as Record<string, unknown>[];
    const sourceWarehouseId = transfer['sourceWarehouseId'] as string;

    for (const line of lines) {
      const lineStatus = line['status'] as InventoryTransferLineStatus;
      if (lineStatus === InventoryTransferLineStatus.DISPATCHED) {
        throw new BusinessRuleException(
          'Transfer has already been dispatched',
          ErrorCode.INVENTORY_TRANSFER_DUPLICATE_DISPATCH,
        );
      }

      const inventoryItemId = line['inventoryItemId'] as string;
      const requestedQuantity = line['requestedQuantity'] as number;
      const sourceLocationId = (line['sourceLocationId'] as string | null) ?? undefined;
      const batchId = (line['batchId'] as string | null) ?? undefined;

      const sourceBucket = await this.stockRepository.findBucket(
        {
          inventoryItemId,
          warehouseId: sourceWarehouseId,
          locationId: sourceLocationId ?? null,
          batchId: batchId ?? null,
          status: InventoryStockStatus.AVAILABLE,
          ownershipType: InventoryOwnershipType.WORKSPACE,
          ownerRef: null,
        },
        workspaceId,
      );
      this.validator.assertSufficientStock((sourceBucket?.['quantity'] as number) ?? 0, requestedQuantity, false);

      const reservation = await this.reservationService.create(
        workspaceId,
        {
          inventoryItemId,
          quantity: requestedQuantity,
          warehouseId: sourceWarehouseId,
          locationId: sourceLocationId,
          batchId,
          source: InventoryReservationSource.TRANSFER,
          sourceReferenceType: 'TRANSFER',
          sourceReferenceId: id,
          idempotencyKey: `transfer:${id}:line:${line['id']}:reservation`,
        },
        userId,
      );

      await this.reservationService.confirm(reservation.id, workspaceId, {}, userId);

      const dispatchKey = `transfer:${id}:line:${line['id']}:dispatch`;
      await this.stockService.dispatch(
        inventoryItemId,
        workspaceId,
        {
          warehouseId: sourceWarehouseId,
          locationId: sourceLocationId,
          batchId,
          serialId: (line['serialId'] as string | null) ?? undefined,
          quantity: requestedQuantity,
          uom: line['uom'] as string,
          referenceType: 'TRANSFER',
          referenceId: id,
          reason: transfer['reason'] as string,
          idempotencyKey: dispatchKey,
        },
        userId,
      );

      const dispatchTransaction = await this.stockRepository.findTransactionByIdempotencyKey(
        workspaceId,
        dispatchKey,
      );

      await this.repository.updateLine(line['id'] as string, {
        status: InventoryTransferLineStatus.DISPATCHED,
        dispatchedQuantity: requestedQuantity,
        reservationId: reservation.id,
        dispatchTransactionId: (dispatchTransaction?.['id'] as string | null) ?? null,
      });
    }

    const updated = await this.repository.update(id, {
      status: InventoryTransferStatus.DISPATCHED,
      shipmentReference: dto.shipmentReference ?? transfer['shipmentReference'],
      dispatchedBy: userId,
      dispatchedAt: new Date(),
    });

    await this.repository.update(id, { status: InventoryTransferStatus.IN_TRANSIT });
    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryTransferStatus.DISPATCHED,
      dto.notes ?? 'Transfer dispatched',
      userId,
    );
    await this.publishEvent(workspaceId, InventoryEvent.TRANSFER_DISPATCHED, { transferId: id });

    const final = await this.repository.findById(id, workspaceId);
    return InventoryTransferResponseDto.from(final!);
  }

  // ── Receive ──────────────────────────────────────────────────

  async receive(
    id: string,
    workspaceId: string,
    dto: ReceiveTransferDto,
    userId: string,
  ): Promise<InventoryTransferResponseDto> {
    const transfer = await this.findOrFail(id, workspaceId);
    const status = transfer['status'] as InventoryTransferStatus;
    this.assertTransferTransition(
      status,
      status === InventoryTransferStatus.PARTIALLY_RECEIVED
        ? InventoryTransferStatus.PARTIALLY_RECEIVED
        : InventoryTransferStatus.RECEIVED,
    );

    const destinationWarehouseId = transfer['destinationWarehouseId'] as string;
    const allLines = transfer['lines'] as Record<string, unknown>[];

    for (const receiptLine of dto.lines) {
      const line = allLines.find((l) => l['id'] === receiptLine.lineId);
      if (!line) {
        throw new ResourceNotFoundException('Transfer line', receiptLine.lineId);
      }

      const lineStatus = line['status'] as InventoryTransferLineStatus;
      if (lineStatus !== InventoryTransferLineStatus.DISPATCHED && lineStatus !== InventoryTransferLineStatus.PARTIALLY_RECEIVED) {
        throw new BusinessRuleException(
          `Line must be dispatched before receiving`,
          ErrorCode.INVENTORY_TRANSFER_INVALID_STATUS_TRANSITION,
        );
      }

      const dispatchedQty = line['dispatchedQuantity'] as number;
      const alreadyReceivedQty = line['receivedQuantity'] as number;
      const alreadyDamagedQty = line['damagedQuantity'] as number;
      const remainingQty = dispatchedQty - alreadyReceivedQty - alreadyDamagedQty;

      const totalReceivingNow = receiptLine.receivedQuantity + (receiptLine.damagedQuantity ?? 0);
      if (totalReceivingNow > remainingQty) {
        throw new BusinessRuleException(
          `Over-receipt not allowed: dispatched=${dispatchedQty}, already received=${alreadyReceivedQty + alreadyDamagedQty}, attempting=${totalReceivingNow}`,
          ErrorCode.INVENTORY_TRANSFER_OVER_RECEIPT,
        );
      }

      const inventoryItemId = line['inventoryItemId'] as string;
      const batchId = (line['batchId'] as string | null) ?? undefined;
      const destinationLocationId = receiptLine.destinationLocationId ?? (line['destinationLocationId'] as string | null) ?? undefined;

      if (destinationLocationId) {
        await this.assertDestinationCapacity(
          workspaceId,
          inventoryItemId,
          destinationWarehouseId,
          destinationLocationId,
          receiptLine.receivedQuantity,
        );
      }

      const receiveKey = `transfer:${id}:line:${line['id']}:receive:${Date.now()}`;
      await this.stockService.receive(
        inventoryItemId,
        workspaceId,
        {
          warehouseId: destinationWarehouseId,
          locationId: destinationLocationId,
          batchId,
          serialId: (line['serialId'] as string | null) ?? undefined,
          quantity: receiptLine.receivedQuantity,
          uom: line['uom'] as string,
          referenceType: 'TRANSFER',
          referenceId: id,
          reason: transfer['reason'] as string,
          idempotencyKey: receiveKey,
        },
        userId,
      );

      const receiveTransaction = await this.stockRepository.findTransactionByIdempotencyKey(workspaceId, receiveKey);

      if (receiptLine.damagedQuantity && receiptLine.damagedQuantity > 0) {
        const damagedKey = `transfer:${id}:line:${line['id']}:damaged:${Date.now()}`;
        await this.stockService.receive(
          inventoryItemId,
          workspaceId,
          {
            warehouseId: destinationWarehouseId,
            locationId: destinationLocationId,
            batchId,
            quantity: receiptLine.damagedQuantity,
            status: InventoryStockStatus.DAMAGED,
            uom: line['uom'] as string,
            referenceType: 'TRANSFER',
            referenceId: id,
            reason: 'Damaged during transfer',
            idempotencyKey: damagedKey,
          },
          userId,
        );
      }

      const newReceivedQty = alreadyReceivedQty + receiptLine.receivedQuantity;
      const newDamagedQty = alreadyDamagedQty + (receiptLine.damagedQuantity ?? 0);
      const newLineStatus =
        newReceivedQty + newDamagedQty >= dispatchedQty
          ? InventoryTransferLineStatus.RECEIVED
          : InventoryTransferLineStatus.PARTIALLY_RECEIVED;

      await this.repository.updateLine(line['id'] as string, {
        status: newLineStatus,
        receivedQuantity: newReceivedQty,
        damagedQuantity: newDamagedQty,
        destinationLocationId: destinationLocationId ?? line['destinationLocationId'],
        receiveTransactionId: (receiveTransaction?.['id'] as string | null) ?? null,
      });
    }

    const updatedLines = await this.repository.findLinesByTransferId(id, workspaceId);
    const allReceived = updatedLines.every((l) => l['status'] === InventoryTransferLineStatus.RECEIVED);
    const anyReceived = updatedLines.some(
      (l) =>
        l['status'] === InventoryTransferLineStatus.RECEIVED ||
        l['status'] === InventoryTransferLineStatus.PARTIALLY_RECEIVED,
    );

    const newStatus = allReceived
      ? InventoryTransferStatus.RECEIVED
      : anyReceived
      ? InventoryTransferStatus.PARTIALLY_RECEIVED
      : status;

    const updated = await this.repository.update(id, {
      status: newStatus,
      receivedBy: userId,
      receivedAt: new Date(),
    });

    await this.recordHistory(id, workspaceId, status, newStatus, dto.notes ?? 'Transfer received', userId);

    const event =
      newStatus === InventoryTransferStatus.RECEIVED
        ? InventoryEvent.TRANSFER_RECEIVED
        : InventoryEvent.TRANSFER_PARTIALLY_RECEIVED;
    await this.publishEvent(workspaceId, event, { transferId: id });

    return InventoryTransferResponseDto.from(updated);
  }

  // ── Cancel ───────────────────────────────────────────────────

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelTransferDto,
    userId: string,
  ): Promise<InventoryTransferResponseDto> {
    const transfer = await this.findOrFail(id, workspaceId);
    const status = transfer['status'] as InventoryTransferStatus;
    this.assertTransferTransition(status, InventoryTransferStatus.CANCELLED);

    const lines = transfer['lines'] as Record<string, unknown>[];
    for (const line of lines) {
      const reservationId = line['reservationId'] as string | null;
      if (reservationId) {
        await this.reservationService.cancel(reservationId, workspaceId, { reason: dto.reason }, userId);
      }

      await this.repository.updateLine(line['id'] as string, {
        status: InventoryTransferLineStatus.CANCELLED,
      });
    }

    const updated = await this.repository.update(id, {
      status: InventoryTransferStatus.CANCELLED,
    });

    await this.recordHistory(id, workspaceId, status, InventoryTransferStatus.CANCELLED, dto.reason, userId);
    await this.publishEvent(workspaceId, InventoryEvent.TRANSFER_CANCELLED, { transferId: id });

    return InventoryTransferResponseDto.from(updated);
  }

  // ── Reverse ──────────────────────────────────────────────────

  async reverse(
    id: string,
    workspaceId: string,
    dto: ReverseTransferDto,
    userId: string,
  ): Promise<InventoryTransferResponseDto> {
    const transfer = await this.findOrFail(id, workspaceId);
    const status = transfer['status'] as InventoryTransferStatus;
    this.assertTransferTransition(status, InventoryTransferStatus.REVERSED);

    const lines = transfer['lines'] as Record<string, unknown>[];
    for (const line of lines) {
      const dispatchTransactionId = line['dispatchTransactionId'] as string | null;
      const receiveTransactionId = line['receiveTransactionId'] as string | null;
      const inventoryItemId = line['inventoryItemId'] as string;

      if (receiveTransactionId) {
        await this.stockService.reverse(inventoryItemId, workspaceId, receiveTransactionId, { reason: dto.reason }, userId);
      }
      if (dispatchTransactionId) {
        await this.stockService.reverse(inventoryItemId, workspaceId, dispatchTransactionId, { reason: dto.reason }, userId);
      }
    }

    const updated = await this.repository.update(id, {
      status: InventoryTransferStatus.REVERSED,
      reversedBy: userId,
      reversedAt: new Date(),
    });

    await this.recordHistory(id, workspaceId, status, InventoryTransferStatus.REVERSED, dto.reason, userId);
    await this.publishEvent(workspaceId, InventoryEvent.TRANSFER_REVERSED, { transferId: id });

    return InventoryTransferResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryTransferFilterDto,
  ): Promise<InventoryTransferListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryTransferListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryTransferResponseDto> {
    const transfer = await this.findOrFail(id, workspaceId);
    return InventoryTransferResponseDto.from(transfer);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryTransferHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryTransferHistoryResponseDto.from);
  }
}
