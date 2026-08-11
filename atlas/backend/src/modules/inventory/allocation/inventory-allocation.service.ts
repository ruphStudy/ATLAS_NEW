import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseRepository } from '@modules/warehouse/warehouse.repository';
import { InventoryRepository } from '../inventory.repository';
import { InventoryBatchRepository } from '../batch/inventory-batch.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryReservationService } from '../reservation/inventory-reservation.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryAllocationRepository } from './inventory-allocation.repository';
import {
  AllocationCandidate,
  InventoryAllocationStrategyEngine,
  ScoredAllocationCandidate,
} from './inventory-allocation-strategy';
import {
  InventoryAllocationLineStatus,
  InventoryAllocationSource,
  InventoryAllocationStatus,
  InventoryAllocationStrategy,
  InventoryEvent,
  InventoryOwnershipType,
  InventoryReservationLineStatus,
  InventoryReservationSource,
  InventoryStockStatus,
  InventoryTrackingType,
} from '../interfaces';
import {
  AllocateInventoryDto,
  CancelAllocationDto,
  InventoryAllocationFilterDto,
  InventoryAllocationHistoryResponseDto,
  InventoryAllocationListResponseDto,
  InventoryAllocationResponseDto,
  InventoryStockFilterDto,
  ReallocateInventoryDto,
  ReleaseAllocationDto,
} from '../dto';

interface AllocationExecutionOptions {
  strategy?: InventoryAllocationStrategy;
  warehouseIds?: string[];
  referenceWarehouseId?: string;
  restrictOwnershipType?: InventoryOwnershipType;
}

@Injectable()
export class InventoryAllocationService {
  constructor(
    private readonly repository: InventoryAllocationRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly batchRepository: InventoryBatchRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly warehouseRepository: WarehouseRepository,
    private readonly reservationService: InventoryReservationService,
    private readonly strategyEngine: InventoryAllocationStrategyEngine,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory allocation', id);
    return record;
  }

  private async recordHistory(
    allocationId: string,
    workspaceId: string,
    fromStatus: InventoryAllocationStatus | null,
    toStatus: InventoryAllocationStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      allocationId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
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

  private mapAllocationSourceToReservationSource(
    source: InventoryAllocationSource,
  ): InventoryReservationSource {
    switch (source) {
      case InventoryAllocationSource.ORDER:
        return InventoryReservationSource.ORDER;
      case InventoryAllocationSource.TRANSFER:
        return InventoryReservationSource.TRANSFER;
      case InventoryAllocationSource.MARKETPLACE:
        return InventoryReservationSource.MARKETPLACE;
      case InventoryAllocationSource.REPLENISHMENT:
        return InventoryReservationSource.TRANSFER;
      case InventoryAllocationSource.MANUAL:
      default:
        return InventoryReservationSource.MANUAL;
    }
  }

  /** Gathers eligible AVAILABLE stock buckets for the item, applying restrictions. */
  private async gatherCandidates(
    item: Record<string, unknown>,
    workspaceId: string,
    options: AllocationExecutionOptions,
  ): Promise<AllocationCandidate[]> {
    const filter = new InventoryStockFilterDto();
    filter.status = InventoryStockStatus.AVAILABLE;
    filter.page = 1;
    filter.limit = 1000;
    if (options.restrictOwnershipType) filter.ownershipType = options.restrictOwnershipType;

    const [buckets] = await this.stockRepository.findAll(item['id'] as string, workspaceId, filter);

    const trackingType = item['trackingType'] as InventoryTrackingType;

    const eligible = buckets.filter((bucket) => {
      if (((bucket['quantity'] as number) ?? 0) <= 0) return false;
      if (options.warehouseIds?.length && !options.warehouseIds.includes(bucket['warehouseId'] as string)) {
        return false;
      }
      if (trackingType === InventoryTrackingType.BATCH && !bucket['batchId']) return false;
      return true;
    });

    const warehouseIds = [...new Set(eligible.map((bucket) => bucket['warehouseId'] as string))];
    const warehouses = await Promise.all(
      warehouseIds.map((id) => this.warehouseRepository.findById(id, workspaceId)),
    );
    const warehouseMap = new Map(warehouseIds.map((id, index) => [id, warehouses[index]]));

    const batchIds = [
      ...new Set(eligible.map((bucket) => bucket['batchId'] as string | null).filter(Boolean) as string[]),
    ];
    const batches = await Promise.all(
      batchIds.map((id) => this.batchRepository.findByWorkspaceId(id, workspaceId)),
    );
    const batchMap = new Map(batchIds.map((id, index) => [id, batches[index]]));

    const now = Date.now();

    return eligible
      .filter((bucket) => {
        const batch = bucket['batchId'] ? batchMap.get(bucket['batchId'] as string) : null;
        const expiryDate = batch?.['expiryDate'] as Date | string | null | undefined;
        if (expiryDate && new Date(expiryDate).getTime() <= now) return false;
        return true;
      })
      .map((bucket) => ({
        warehouseId: bucket['warehouseId'] as string,
        locationId: (bucket['locationId'] as string | null) ?? null,
        batchId: (bucket['batchId'] as string | null) ?? null,
        quantity: bucket['quantity'] as number,
        bucketCreatedAt: bucket['createdAt'] as Date,
        warehouse: warehouseMap.get(bucket['warehouseId'] as string) ?? null,
        batch: bucket['batchId'] ? (batchMap.get(bucket['batchId'] as string) ?? null) : null,
      }));
  }

  // ── Allocate ─────────────────────────────────────────────────

  async allocate(
    workspaceId: string,
    dto: AllocateInventoryDto,
    createdBy: string,
  ): Promise<InventoryAllocationResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        const lines = await this.repository.findLines(existing['id'] as string, workspaceId);
        return InventoryAllocationResponseDto.from(existing, lines);
      }
    }

    if (dto.sourceReferenceType && dto.sourceReferenceId) {
      const existingActive = await this.repository.findActiveBySourceReference(
        workspaceId,
        dto.inventoryItemId,
        dto.sourceReferenceType,
        dto.sourceReferenceId,
      );
      if (existingActive) {
        throw new DuplicateResourceException(
          'Inventory allocation',
          'sourceReferenceId',
          dto.sourceReferenceId,
        );
      }
    }

    const item = await this.inventoryRepository.findById(dto.inventoryItemId, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', dto.inventoryItemId);

    this.validator.assertQuantityPositive(dto.quantity);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const strategy = dto.strategy ?? InventoryAllocationStrategy.HIGHEST_AVAILABLE_STOCK;

    const allocation = await this.repository.create({
      workspaceId,
      inventoryItemId: dto.inventoryItemId,
      sku: (item['sku'] as string | null) ?? null,
      catalogProductId: (item['catalogProductId'] as string | null) ?? null,
      variantId: (item['variantId'] as string | null) ?? null,
      source: dto.source ?? InventoryAllocationSource.MANUAL,
      sourceReferenceType: dto.sourceReferenceType ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      strategy,
      status: InventoryAllocationStatus.PENDING,
      priority: dto.priority ?? 0,
      requestedQuantity: dto.quantity,
      allocatedQuantity: 0,
      releasedQuantity: 0,
      uom,
      restrictOwnershipType: dto.restrictOwnershipType ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
    });

    await this.recordHistory(
      allocation['id'] as string,
      workspaceId,
      null,
      InventoryAllocationStatus.PENDING,
      'Allocation requested',
      createdBy,
    );

    await this.publishEvent(item, workspaceId, InventoryEvent.ALLOCATION_CREATED, {
      allocationId: allocation['id'],
      requestedQuantity: dto.quantity,
      strategy,
    });

    return this.executeAllocation(allocation, item, dto, workspaceId, createdBy, false);
  }

  async reallocate(
    id: string,
    workspaceId: string,
    dto: ReallocateInventoryDto,
    userId: string,
  ): Promise<InventoryAllocationResponseDto> {
    const allocation = await this.findOrFail(id, workspaceId);
    const status = allocation['status'] as InventoryAllocationStatus;

    if (
      status !== InventoryAllocationStatus.SHORTAGE &&
      status !== InventoryAllocationStatus.PARTIALLY_ALLOCATED
    ) {
      throw new BusinessRuleException(
        `Cannot reallocate an allocation in status ${status}`,
        ErrorCode.INVENTORY_ALLOCATION_INVALID_STATUS_TRANSITION,
      );
    }

    const item = await this.inventoryRepository.findById(
      allocation['inventoryItemId'] as string,
      workspaceId,
    );
    if (!item) {
      throw new ResourceNotFoundException('Inventory item', allocation['inventoryItemId'] as string);
    }

    if (dto.strategy) {
      await this.repository.update(id, { strategy: dto.strategy });
    }

    return this.executeAllocation(
      { ...allocation, strategy: dto.strategy ?? allocation['strategy'] },
      item,
      {
        strategy: dto.strategy,
        warehouseIds: dto.warehouseIds,
        referenceWarehouseId: dto.referenceWarehouseId,
        restrictOwnershipType: dto.restrictOwnershipType ?? (allocation['restrictOwnershipType'] as InventoryOwnershipType | null) ?? undefined,
      },
      workspaceId,
      userId,
      true,
    );
  }

  private async executeAllocation(
    allocation: Record<string, unknown>,
    item: Record<string, unknown>,
    options: AllocationExecutionOptions,
    workspaceId: string,
    actorId: string,
    isReallocation: boolean,
  ): Promise<InventoryAllocationResponseDto> {
    const id = allocation['id'] as string;
    const currentStatus = allocation['status'] as InventoryAllocationStatus;
    const requestedTotal = allocation['requestedQuantity'] as number;
    const alreadyAllocated = allocation['allocatedQuantity'] as number;
    const alreadyReleased = allocation['releasedQuantity'] as number;
    const stillNeeded = requestedTotal - alreadyAllocated - alreadyReleased;

    if (stillNeeded <= 0) {
      const lines = await this.repository.findLines(id, workspaceId);
      return InventoryAllocationResponseDto.from(allocation, lines);
    }

    const strategy = options.strategy ?? (allocation['strategy'] as InventoryAllocationStrategy);
    const candidates = await this.gatherCandidates(item, workspaceId, options);

    const totalEligible = candidates.reduce((sum, candidate) => sum + candidate.quantity, 0);
    const safetyStock = (item['safetyStock'] as number) ?? 0;
    const safeAvailable = Math.max(0, totalEligible - safetyStock);
    const capped = Math.min(stillNeeded, safeAvailable);

    let referenceWarehouse: Record<string, unknown> | null = null;
    if (options.referenceWarehouseId) {
      referenceWarehouse = await this.warehouseRepository.findById(options.referenceWarehouseId, workspaceId);
    }

    const ranked = this.strategyEngine.rank(strategy, candidates, { referenceWarehouse });

    const picks: (ScoredAllocationCandidate & { quantity: number })[] = [];
    let remaining = capped;
    for (const candidate of ranked) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, candidate.quantity);
      if (take <= 0) continue;
      picks.push({ ...candidate, quantity: take });
      remaining -= take;
    }

    if (picks.length === 0) {
      const newStatus =
        alreadyAllocated > 0 ? InventoryAllocationStatus.PARTIALLY_ALLOCATED : InventoryAllocationStatus.SHORTAGE;
      this.validator.assertAllocationTransition(currentStatus, newStatus);

      const updated = await this.repository.update(id, {
        status: newStatus,
        ...(isReallocation && { reallocationCount: { increment: 1 } }),
      });
      await this.recordHistory(
        id,
        workspaceId,
        currentStatus,
        newStatus,
        isReallocation ? 'Reallocation found no available stock' : 'No available stock could be allocated',
        actorId,
      );
      await this.publishEvent(item, workspaceId, InventoryEvent.ALLOCATION_SHORTAGE, { allocationId: id });

      const lines = await this.repository.findLines(id, workspaceId);
      return InventoryAllocationResponseDto.from(updated, lines);
    }

    const allocatableNow = picks.reduce((sum, pick) => sum + pick.quantity, 0);

    const reservation = await this.reservationService.create(
      workspaceId,
      {
        inventoryItemId: item['id'] as string,
        source: this.mapAllocationSourceToReservationSource(allocation['source'] as InventoryAllocationSource),
        sourceReferenceType: (allocation['sourceReferenceType'] as string | null) ?? undefined,
        sourceReferenceId: (allocation['sourceReferenceId'] as string | null) ?? undefined,
        quantity: allocatableNow,
        uom: allocation['uom'] as string,
        priority: allocation['priority'] as number,
        lines: picks.map((pick) => ({
          warehouseId: pick.warehouseId,
          locationId: pick.locationId ?? undefined,
          batchId: pick.batchId ?? undefined,
          quantity: pick.quantity,
        })),
      },
      actorId,
    );

    const confirmed = await this.reservationService.confirm(reservation.id, workspaceId, {}, actorId);
    const activeLines = (confirmed.lines ?? []).filter(
      (line) => line.status === InventoryReservationLineStatus.ACTIVE,
    );

    let allocatedNow = 0;
    for (const line of activeLines) {
      const pick = picks.find(
        (p) =>
          p.warehouseId === line.warehouseId &&
          (p.locationId ?? null) === (line.locationId ?? null) &&
          (p.batchId ?? null) === (line.batchId ?? null),
      );
      await this.repository.createLine({
        allocationId: id,
        workspaceId,
        reservationId: reservation.id,
        warehouseId: line.warehouseId,
        locationId: line.locationId ?? null,
        batchId: line.batchId ?? null,
        ownershipType: line.ownershipType,
        ownerRef: line.ownerRef ?? null,
        quantity: line.quantity,
        score: pick?.score ?? null,
        reason: pick?.reason ?? null,
        status: InventoryAllocationLineStatus.ALLOCATED,
      });
      allocatedNow += line.quantity;
    }

    const newAllocatedQuantity = alreadyAllocated + allocatedNow;
    const newStillNeeded = requestedTotal - newAllocatedQuantity - alreadyReleased;
    const newStatus =
      newStillNeeded <= 0 ? InventoryAllocationStatus.ALLOCATED : InventoryAllocationStatus.PARTIALLY_ALLOCATED;

    this.validator.assertAllocationTransition(currentStatus, newStatus);

    const updated = await this.repository.update(id, {
      allocatedQuantity: newAllocatedQuantity,
      status: newStatus,
      ...(isReallocation && { reallocationCount: { increment: 1 } }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      newStatus,
      isReallocation ? 'Reallocated additional stock' : 'Allocation executed',
      actorId,
    );

    await this.publishEvent(
      item,
      workspaceId,
      newStatus === InventoryAllocationStatus.ALLOCATED
        ? InventoryEvent.ALLOCATION_ALLOCATED
        : InventoryEvent.ALLOCATION_PARTIALLY_ALLOCATED,
      { allocationId: id, allocatedQuantity: allocatedNow, reservationId: reservation.id },
    );

    const lines = await this.repository.findLines(id, workspaceId);
    return InventoryAllocationResponseDto.from(updated, lines);
  }

  // ── Release / Cancel ─────────────────────────────────────────

  private async releaseLines(
    allocation: Record<string, unknown>,
    workspaceId: string,
    requestedQuantity: number | undefined,
    targetStatus: InventoryAllocationStatus,
    lineTargetStatus: InventoryAllocationLineStatus,
    reason: string,
    userId: string,
    event: InventoryEvent,
  ): Promise<InventoryAllocationResponseDto> {
    const id = allocation['id'] as string;
    const status = allocation['status'] as InventoryAllocationStatus;
    this.validator.assertAllocationTransition(status, targetStatus);

    const activeLines = await this.repository.findLines(id, workspaceId, InventoryAllocationLineStatus.ALLOCATED);
    let remaining =
      requestedQuantity ?? activeLines.reduce((sum, line) => sum + (line['quantity'] as number), 0);
    this.validator.assertQuantityPositive(remaining);

    let releasedTotal = 0;

    for (const line of activeLines) {
      if (remaining <= 0) break;
      const lineQuantity = line['quantity'] as number;
      const toRelease = Math.min(lineQuantity, remaining);
      if (toRelease <= 0) continue;

      await this.reservationService.release(
        line['reservationId'] as string,
        workspaceId,
        { quantity: toRelease, reason },
        userId,
      );

      const remainingLineQuantity = lineQuantity - toRelease;
      await this.repository.updateLine(line['id'] as string, {
        quantity: remainingLineQuantity,
        status: remainingLineQuantity <= 0 ? lineTargetStatus : InventoryAllocationLineStatus.ALLOCATED,
      });

      releasedTotal += toRelease;
      remaining -= toRelease;
    }

    const newAllocatedQuantity = Math.max(0, (allocation['allocatedQuantity'] as number) - releasedTotal);
    const newReleasedQuantity = (allocation['releasedQuantity'] as number) + releasedTotal;
    const fullyReleased = newAllocatedQuantity <= 0;
    const newStatus = fullyReleased ? targetStatus : (allocation['status'] as InventoryAllocationStatus);

    const updated = await this.repository.update(id, {
      allocatedQuantity: newAllocatedQuantity,
      releasedQuantity: newReleasedQuantity,
      status: newStatus,
    });

    await this.recordHistory(id, workspaceId, status, newStatus, reason, userId);

    const item = await this.inventoryRepository.findById(allocation['inventoryItemId'] as string, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, event, {
        allocationId: id,
        releasedQuantity: releasedTotal,
        fullyReleased,
      });
    }

    const lines = await this.repository.findLines(id, workspaceId);
    return InventoryAllocationResponseDto.from(updated, lines);
  }

  async release(
    id: string,
    workspaceId: string,
    dto: ReleaseAllocationDto,
    userId: string,
  ): Promise<InventoryAllocationResponseDto> {
    const allocation = await this.findOrFail(id, workspaceId);
    return this.releaseLines(
      allocation,
      workspaceId,
      dto.quantity,
      InventoryAllocationStatus.RELEASED,
      InventoryAllocationLineStatus.RELEASED,
      dto.reason ?? 'Allocation released',
      userId,
      InventoryEvent.ALLOCATION_RELEASED,
    );
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelAllocationDto,
    userId: string,
  ): Promise<InventoryAllocationResponseDto> {
    const allocation = await this.findOrFail(id, workspaceId);
    const status = allocation['status'] as InventoryAllocationStatus;

    if (status === InventoryAllocationStatus.PENDING || status === InventoryAllocationStatus.SHORTAGE) {
      this.validator.assertAllocationTransition(status, InventoryAllocationStatus.CANCELLED);
      const updated = await this.repository.update(id, { status: InventoryAllocationStatus.CANCELLED });
      await this.recordHistory(
        id,
        workspaceId,
        status,
        InventoryAllocationStatus.CANCELLED,
        dto.reason ?? 'Allocation cancelled',
        userId,
      );
      const item = await this.inventoryRepository.findById(allocation['inventoryItemId'] as string, workspaceId);
      if (item) {
        await this.publishEvent(item, workspaceId, InventoryEvent.ALLOCATION_CANCELLED, { allocationId: id });
      }
      const lines = await this.repository.findLines(id, workspaceId);
      return InventoryAllocationResponseDto.from(updated, lines);
    }

    return this.releaseLines(
      allocation,
      workspaceId,
      undefined,
      InventoryAllocationStatus.CANCELLED,
      InventoryAllocationLineStatus.CANCELLED,
      dto.reason ?? 'Allocation cancelled',
      userId,
      InventoryEvent.ALLOCATION_CANCELLED,
    );
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryAllocationFilterDto,
  ): Promise<InventoryAllocationListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryAllocationListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryAllocationResponseDto> {
    const allocation = await this.findOrFail(id, workspaceId);
    const lines = await this.repository.findLines(id, workspaceId);
    return InventoryAllocationResponseDto.from(allocation, lines);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryAllocationHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryAllocationHistoryResponseDto.from);
  }
}
