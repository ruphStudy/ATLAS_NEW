import { Injectable } from '@nestjs/common';
import { BusinessRuleException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryStockService } from '../stock/inventory-stock.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryReservationRepository } from './inventory-reservation.repository';
import { InventoryReservationExpiryQueue } from './jobs/inventory-reservation-expiry.queue';
import {
  InventoryEvent,
  InventoryReservationLineStatus,
  InventoryReservationSource,
  InventoryReservationStatus,
  InventoryStockStatus,
} from '../interfaces';
import {
  CancelReservationDto,
  ConfirmReservationDto,
  CreateReservationDto,
  InventoryReservationFilterDto,
  InventoryReservationHistoryResponseDto,
  InventoryReservationListResponseDto,
  InventoryReservationResponseDto,
  InventoryStockFilterDto,
  ReleaseReservationDto,
} from '../dto';
import { INVENTORY_RESERVATION_CONSTANTS } from '../constants';

interface PlannedLine {
  warehouseId: string;
  locationId: string | null;
  batchId: string | null;
  quantity: number;
}

@Injectable()
export class InventoryReservationService {
  constructor(
    private readonly repository: InventoryReservationRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly stockService: InventoryStockService,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
    private readonly expiryQueue: InventoryReservationExpiryQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory reservation', id);
    return record;
  }

  private async recordHistory(
    reservationId: string,
    workspaceId: string,
    fromStatus: InventoryReservationStatus | null,
    toStatus: InventoryReservationStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      reservationId,
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

  private resolveExpiresAt(dto: CreateReservationDto): Date | null {
    if (dto.expiresAt) return new Date(dto.expiresAt);
    if (dto.expiresInMinutes) {
      const date = new Date();
      date.setMinutes(date.getMinutes() + dto.expiresInMinutes);
      return date;
    }
    return null;
  }

  /**
   * Resolves how the requested quantity should be split into reservation lines:
   * explicit lines win, then a single named warehouse, then a greedy auto-split
   * across every warehouse currently holding AVAILABLE stock for the item.
   */
  private async planLines(
    dto: CreateReservationDto,
    workspaceId: string,
  ): Promise<PlannedLine[]> {
    if (dto.lines?.length) {
      return dto.lines.map((line) => ({
        warehouseId: line.warehouseId,
        locationId: line.locationId ?? null,
        batchId: line.batchId ?? null,
        quantity: line.quantity,
      }));
    }

    if (dto.warehouseId) {
      return [
        {
          warehouseId: dto.warehouseId,
          locationId: dto.locationId ?? null,
          batchId: dto.batchId ?? null,
          quantity: dto.quantity,
        },
      ];
    }

    const filter = new InventoryStockFilterDto();
    filter.status = InventoryStockStatus.AVAILABLE;
    filter.page = 1;
    filter.limit = 500;

    const [buckets] = await this.stockRepository.findAll(dto.inventoryItemId, workspaceId, filter);
    const sorted = buckets
      .filter((bucket) => (bucket['quantity'] as number) > 0)
      .sort((a, b) => (b['quantity'] as number) - (a['quantity'] as number));

    const lines: PlannedLine[] = [];
    let remaining = dto.quantity;

    for (const bucket of sorted) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, bucket['quantity'] as number);
      lines.push({
        warehouseId: bucket['warehouseId'] as string,
        locationId: (bucket['locationId'] as string | null) ?? null,
        batchId: (bucket['batchId'] as string | null) ?? null,
        quantity: take,
      });
      remaining -= take;
    }

    return lines;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateReservationDto,
    createdBy: string,
  ): Promise<InventoryReservationResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        const lines = await this.repository.findLines(existing['id'] as string, workspaceId);
        return InventoryReservationResponseDto.from(existing, lines);
      }
    }

    const item = await this.inventoryRepository.findById(dto.inventoryItemId, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', dto.inventoryItemId);

    this.validator.assertQuantityPositive(dto.quantity);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const plannedLines = await this.planLines(dto, workspaceId);
    const plannedTotal = plannedLines.reduce((sum, line) => sum + line.quantity, 0);

    if (plannedTotal <= 0) {
      throw new BusinessRuleException(
        'No available stock could be allocated for this reservation',
        ErrorCode.INVENTORY_RESERVATION_UNFULFILLABLE,
      );
    }

    const expiresAt = this.resolveExpiresAt(dto);

    const reservation = await this.repository.create({
      workspaceId,
      inventoryItemId: dto.inventoryItemId,
      sku: (item['sku'] as string | null) ?? null,
      catalogProductId: (item['catalogProductId'] as string | null) ?? null,
      variantId: (item['variantId'] as string | null) ?? null,
      source: dto.source ?? InventoryReservationSource.MANUAL,
      sourceReferenceType: dto.sourceReferenceType ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      status: InventoryReservationStatus.PENDING,
      priority: dto.priority ?? 0,
      requestedQuantity: dto.quantity,
      reservedQuantity: 0,
      releasedQuantity: 0,
      uom,
      expiresAt,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
    });

    const reservationId = reservation['id'] as string;

    for (const line of plannedLines) {
      await this.repository.createLine({
        reservationId,
        workspaceId,
        warehouseId: line.warehouseId,
        locationId: line.locationId,
        batchId: line.batchId,
        quantity: line.quantity,
        status: InventoryReservationLineStatus.PLANNED,
      });
    }

    await this.recordHistory(
      reservationId,
      workspaceId,
      null,
      InventoryReservationStatus.PENDING,
      'Reservation created',
      createdBy,
    );

    if (expiresAt) {
      await this.expiryQueue.scheduleExpiry(
        { reservationId, workspaceId, inventoryItemId: dto.inventoryItemId },
        expiresAt,
      );
    }

    await this.publishEvent(item, workspaceId, InventoryEvent.RESERVATION_CREATED, {
      reservationId,
      requestedQuantity: dto.quantity,
      plannedQuantity: plannedTotal,
    });

    const lines = await this.repository.findLines(reservationId, workspaceId);
    return InventoryReservationResponseDto.from(reservation, lines);
  }

  // ── Confirm ──────────────────────────────────────────────────

  async confirm(
    id: string,
    workspaceId: string,
    dto: ConfirmReservationDto,
    userId: string,
  ): Promise<InventoryReservationResponseDto> {
    const reservation = await this.findOrFail(id, workspaceId);
    const status = reservation['status'] as InventoryReservationStatus;
    this.validator.assertReservationTransition(status, InventoryReservationStatus.CONFIRMED);

    const inventoryItemId = reservation['inventoryItemId'] as string;
    const lines = await this.repository.findLines(id, workspaceId, InventoryReservationLineStatus.PLANNED);

    let reservedTotal = 0;
    for (const line of lines) {
      try {
        await this.stockService.reserve(
          inventoryItemId,
          workspaceId,
          {
            warehouseId: line['warehouseId'] as string,
            locationId: (line['locationId'] as string | null) ?? undefined,
            batchId: (line['batchId'] as string | null) ?? undefined,
            quantity: line['quantity'] as number,
            referenceType: 'inventory_reservation',
            referenceId: id,
          },
          userId,
        );
        await this.repository.updateLine(line['id'] as string, {
          status: InventoryReservationLineStatus.ACTIVE,
        });
        reservedTotal += line['quantity'] as number;
      } catch (error) {
        if (
          error instanceof BusinessRuleException &&
          error.errorCode === ErrorCode.INVENTORY_INSUFFICIENT_STOCK
        ) {
          await this.repository.updateLine(line['id'] as string, {
            status: InventoryReservationLineStatus.CANCELLED,
          });
          continue;
        }
        throw error;
      }
    }

    if (reservedTotal <= 0) {
      throw new BusinessRuleException(
        'Unable to confirm reservation — no stock could be locked',
        ErrorCode.INVENTORY_RESERVATION_UNFULFILLABLE,
      );
    }

    const updated = await this.repository.update(id, {
      status: InventoryReservationStatus.CONFIRMED,
      reservedQuantity: reservedTotal,
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryReservationStatus.CONFIRMED,
      dto.notes ?? 'Reservation confirmed',
      userId,
    );

    const item = await this.inventoryRepository.findById(inventoryItemId, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, InventoryEvent.RESERVATION_CONFIRMED, {
        reservationId: id,
        reservedQuantity: reservedTotal,
      });
    }

    const allLines = await this.repository.findLines(id, workspaceId);
    return InventoryReservationResponseDto.from(updated, allLines);
  }

  // ── Release / Expire / Cancel ─────────────────────────────────

  private async terminatePendingReservation(
    reservation: Record<string, unknown>,
    workspaceId: string,
    targetStatus: InventoryReservationStatus,
    reason: string,
    userId: string,
    event: InventoryEvent,
  ): Promise<InventoryReservationResponseDto> {
    const id = reservation['id'] as string;
    const status = reservation['status'] as InventoryReservationStatus;
    this.validator.assertReservationTransition(status, targetStatus);

    const lines = await this.repository.findLines(id, workspaceId, InventoryReservationLineStatus.PLANNED);
    for (const line of lines) {
      await this.repository.updateLine(line['id'] as string, {
        status: InventoryReservationLineStatus.CANCELLED,
      });
    }

    const updated = await this.repository.update(id, { status: targetStatus });
    await this.recordHistory(id, workspaceId, status, targetStatus, reason, userId);
    await this.expiryQueue.cancelExpiry(id);

    const item = await this.inventoryRepository.findById(
      reservation['inventoryItemId'] as string,
      workspaceId,
    );
    if (item) {
      await this.publishEvent(item, workspaceId, event, { reservationId: id });
    }

    const allLines = await this.repository.findLines(id, workspaceId);
    return InventoryReservationResponseDto.from(updated, allLines);
  }

  private async releaseInternal(
    id: string,
    workspaceId: string,
    requestedQuantity: number | undefined,
    reason: string,
    userId: string,
    targetStatusIfFullyReleased: InventoryReservationStatus,
    event: InventoryEvent,
  ): Promise<InventoryReservationResponseDto> {
    const reservation = await this.findOrFail(id, workspaceId);
    const status = reservation['status'] as InventoryReservationStatus;
    this.validator.assertReservationTransition(status, targetStatusIfFullyReleased);

    const inventoryItemId = reservation['inventoryItemId'] as string;
    const activeLines = await this.repository.findLines(id, workspaceId, InventoryReservationLineStatus.ACTIVE);

    let remaining =
      requestedQuantity ?? activeLines.reduce((sum, line) => sum + (line['quantity'] as number), 0);
    this.validator.assertQuantityPositive(remaining);

    let releasedTotal = 0;

    for (const line of activeLines) {
      if (remaining <= 0) break;
      const lineQuantity = line['quantity'] as number;
      const toRelease = Math.min(lineQuantity, remaining);
      if (toRelease <= 0) continue;

      await this.stockService.release(
        inventoryItemId,
        workspaceId,
        {
          warehouseId: line['warehouseId'] as string,
          locationId: (line['locationId'] as string | null) ?? undefined,
          batchId: (line['batchId'] as string | null) ?? undefined,
          quantity: toRelease,
          referenceType: 'inventory_reservation',
          referenceId: id,
        },
        userId,
      );

      const remainingLineQuantity = lineQuantity - toRelease;
      await this.repository.updateLine(line['id'] as string, {
        quantity: remainingLineQuantity,
        status:
          remainingLineQuantity <= 0
            ? InventoryReservationLineStatus.RELEASED
            : InventoryReservationLineStatus.ACTIVE,
      });

      releasedTotal += toRelease;
      remaining -= toRelease;
    }

    const newReservedQuantity = Math.max(0, (reservation['reservedQuantity'] as number) - releasedTotal);
    const newReleasedQuantity = (reservation['releasedQuantity'] as number) + releasedTotal;
    const fullyReleased = newReservedQuantity <= 0;
    const newStatus = fullyReleased ? targetStatusIfFullyReleased : InventoryReservationStatus.CONFIRMED;

    const updated = await this.repository.update(id, {
      reservedQuantity: newReservedQuantity,
      releasedQuantity: newReleasedQuantity,
      status: newStatus,
    });

    await this.recordHistory(id, workspaceId, status, newStatus, reason, userId);

    if (fullyReleased) {
      await this.expiryQueue.cancelExpiry(id);
    }

    const item = await this.inventoryRepository.findById(inventoryItemId, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, event, {
        reservationId: id,
        releasedQuantity: releasedTotal,
        fullyReleased,
      });
    }

    const allLines = await this.repository.findLines(id, workspaceId);
    return InventoryReservationResponseDto.from(updated, allLines);
  }

  async release(
    id: string,
    workspaceId: string,
    dto: ReleaseReservationDto,
    userId: string,
  ): Promise<InventoryReservationResponseDto> {
    return this.releaseInternal(
      id,
      workspaceId,
      dto.quantity,
      dto.reason ?? 'Reservation released',
      userId,
      InventoryReservationStatus.RELEASED,
      InventoryEvent.RESERVATION_RELEASED,
    );
  }

  /** Invoked by the queue-based expiry worker; a no-op if the reservation already reached a terminal state. */
  async expire(
    id: string,
    workspaceId: string,
    userId: string = INVENTORY_RESERVATION_CONSTANTS.SYSTEM_ACTOR,
  ): Promise<InventoryReservationResponseDto | null> {
    const reservation = await this.repository.findById(id, workspaceId);
    if (!reservation) return null;

    const status = reservation['status'] as InventoryReservationStatus;
    if (
      status !== InventoryReservationStatus.PENDING &&
      status !== InventoryReservationStatus.CONFIRMED
    ) {
      return null;
    }

    if (status === InventoryReservationStatus.PENDING) {
      return this.terminatePendingReservation(
        reservation,
        workspaceId,
        InventoryReservationStatus.EXPIRED,
        'Reservation expired',
        userId,
        InventoryEvent.RESERVATION_EXPIRED,
      );
    }

    return this.releaseInternal(
      id,
      workspaceId,
      undefined,
      'Reservation expired',
      userId,
      InventoryReservationStatus.EXPIRED,
      InventoryEvent.RESERVATION_EXPIRED,
    );
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelReservationDto,
    userId: string,
  ): Promise<InventoryReservationResponseDto> {
    const reservation = await this.findOrFail(id, workspaceId);
    const status = reservation['status'] as InventoryReservationStatus;

    if (status === InventoryReservationStatus.PENDING) {
      return this.terminatePendingReservation(
        reservation,
        workspaceId,
        InventoryReservationStatus.CANCELLED,
        dto.reason ?? 'Reservation cancelled',
        userId,
        InventoryEvent.RESERVATION_CANCELLED,
      );
    }

    return this.releaseInternal(
      id,
      workspaceId,
      undefined,
      dto.reason ?? 'Reservation cancelled',
      userId,
      InventoryReservationStatus.CANCELLED,
      InventoryEvent.RESERVATION_CANCELLED,
    );
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryReservationFilterDto,
  ): Promise<InventoryReservationListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryReservationListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryReservationResponseDto> {
    const reservation = await this.findOrFail(id, workspaceId);
    const lines = await this.repository.findLines(id, workspaceId);
    return InventoryReservationResponseDto.from(reservation, lines);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryReservationHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryReservationHistoryResponseDto.from);
  }
}
