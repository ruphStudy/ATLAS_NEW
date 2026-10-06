import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ShipmentRepository } from './shipment.repository';
import { ShipmentEventQueue, TrackingSyncQueue } from './jobs';
import {
  ShipmentAddress,
  ShipmentAttachment,
  ShipmentPackage,
  ShipmentStatus,
  ShipmentTrackingEvent,
} from './interfaces';
import {
  CancelShipmentDto,
  CreateShipmentDto,
  DeliverShipmentDto,
  DispatchShipmentDto,
  ShipmentFilterDto,
  ShipmentListResponseDto,
  ShipmentResponseDto,
  ShipmentTrackingHistoryResponseDto,
  UpdateShipmentDto,
  UpdateTrackingDto,
} from './dto';
import { SHIPMENT_CONSTANTS } from './constants';

@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private readonly repository: ShipmentRepository,
    private readonly eventQueue: ShipmentEventQueue,
    private readonly syncQueue: TrackingSyncQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateShipmentDto,
    createdBy: string,
  ): Promise<ShipmentResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const shipmentNumber = `${SHIPMENT_CONSTANTS.NUMBER_PREFIX}-${String(sequence).padStart(SHIPMENT_CONSTANTS.NUMBER_PAD_LENGTH, '0')}`;

    const record = await this.repository.create({
      workspaceId,
      shipmentNumber,
      shipmentSequence: sequence,
      purchaseOrderId: dto.purchaseOrderId ?? null,
      supplierId: dto.supplierId ?? null,
      status: ShipmentStatus.PENDING,
      isPartial: dto.isPartial ?? false,
      carrier: dto.carrier ?? null,
      trackingNumber: dto.trackingNumber ?? null,
      shipmentMethod: dto.shipmentMethod ?? null,
      origin: dto.origin ?? null,
      destination: dto.destination ?? null,
      dispatchDate: dto.dispatchDate ? new Date(dto.dispatchDate) : null,
      estimatedDeliveryDate: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : null,
      actualDeliveryDate: null,
      shippingCost: dto.shippingCost ?? null,
      currency: dto.currency ?? null,
      totalWeight: dto.totalWeight ?? null,
      weightUnit: dto.weightUnit ?? null,
      packages: dto.packages ?? [],
      notes: dto.notes ?? null,
      attachments: dto.attachments ?? [],
      lastTrackedAt: null,
      cancelReason: null,
    });

    await this.repository.createTrackingEvent({
      shipmentId: record['id'] as string,
      workspaceId,
      fromStatus: ShipmentStatus.PENDING,
      toStatus: ShipmentStatus.PENDING,
      location: null,
      description: 'Shipment created',
      source: 'SYSTEM',
      changedBy: createdBy,
    });

    await this.eventQueue.enqueue({
      shipmentId: record['id'] as string,
      shipmentNumber,
      workspaceId,
      event: SHIPMENT_CONSTANTS.EVENTS.CREATED,
      trackingNumber: dto.trackingNumber ?? null,
      carrier: dto.carrier ?? null,
    });

    this.logger.log(`Shipment created: ${shipmentNumber}`);
    return this.mapToResponse(record);
  }

  // ── Update ────────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);

    const nonEditable: ShipmentStatus[] = [ShipmentStatus.DELIVERED, ShipmentStatus.CANCELLED];
    if (nonEditable.includes(record['status'] as ShipmentStatus)) {
      throw new BadRequestException(`Cannot update a shipment in ${record['status']} status`);
    }

    const data: Record<string, unknown> = {};
    if (dto.purchaseOrderId !== undefined) data['purchaseOrderId'] = dto.purchaseOrderId;
    if (dto.supplierId !== undefined) data['supplierId'] = dto.supplierId;
    if (dto.isPartial !== undefined) data['isPartial'] = dto.isPartial;
    if (dto.carrier !== undefined) data['carrier'] = dto.carrier;
    if (dto.trackingNumber !== undefined) data['trackingNumber'] = dto.trackingNumber;
    if (dto.shipmentMethod !== undefined) data['shipmentMethod'] = dto.shipmentMethod;
    if (dto.origin !== undefined) data['origin'] = dto.origin;
    if (dto.destination !== undefined) data['destination'] = dto.destination;
    if (dto.dispatchDate !== undefined) data['dispatchDate'] = new Date(dto.dispatchDate);
    if (dto.estimatedDeliveryDate !== undefined) data['estimatedDeliveryDate'] = new Date(dto.estimatedDeliveryDate);
    if (dto.shippingCost !== undefined) data['shippingCost'] = dto.shippingCost;
    if (dto.currency !== undefined) data['currency'] = dto.currency;
    if (dto.totalWeight !== undefined) data['totalWeight'] = dto.totalWeight;
    if (dto.weightUnit !== undefined) data['weightUnit'] = dto.weightUnit;
    if (dto.packages !== undefined) data['packages'] = dto.packages;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.attachments !== undefined) data['attachments'] = dto.attachments;

    const updated = await this.repository.update(id, data);
    return this.mapToResponse(updated);
  }

  // ── Dispatch ──────────────────────────────────────────────────

  async dispatch(
    id: string,
    workspaceId: string,
    dto: DispatchShipmentDto,
    userId: string,
  ): Promise<ShipmentResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ShipmentStatus, ShipmentStatus.DISPATCHED);

    const data: Record<string, unknown> = { status: ShipmentStatus.DISPATCHED };
    if (dto.trackingNumber) data['trackingNumber'] = dto.trackingNumber;
    if (dto.carrier) data['carrier'] = dto.carrier;
    if (dto.dispatchDate) data['dispatchDate'] = new Date(dto.dispatchDate);

    const updated = await this.repository.update(id, data);

    await this.repository.createTrackingEvent({
      shipmentId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: ShipmentStatus.DISPATCHED,
      location: null,
      description: dto.notes ?? 'Shipment dispatched',
      source: 'MANUAL',
      changedBy: userId,
    });

    await this.eventQueue.enqueue({
      shipmentId: id,
      shipmentNumber: updated['shipmentNumber'] as string,
      workspaceId,
      event: SHIPMENT_CONSTANTS.EVENTS.DISPATCHED,
      trackingNumber: updated['trackingNumber'] as string | null,
      carrier: updated['carrier'] as string | null,
    });

    // Enqueue tracking sync if trackable
    if (updated['trackingNumber'] && updated['carrier']) {
      await this.syncQueue.enqueue({
        shipmentId: id,
        shipmentNumber: updated['shipmentNumber'] as string,
        workspaceId,
        trackingNumber: updated['trackingNumber'] as string,
        carrier: updated['carrier'] as string,
      });
    }

    this.logger.log(`Shipment dispatched: ${updated['shipmentNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Tracking update (manual or from carrier sync) ─────────────

  async updateTracking(
    id: string,
    workspaceId: string,
    dto: UpdateTrackingDto,
    userId: string,
    source: 'MANUAL' | 'CARRIER' | 'SYSTEM' = 'MANUAL',
  ): Promise<ShipmentResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ShipmentStatus, dto.status);

    const data: Record<string, unknown> = {
      status: dto.status,
      lastTrackedAt: new Date(),
    };
    if (dto.estimatedDeliveryDate) {
      data['estimatedDeliveryDate'] = new Date(dto.estimatedDeliveryDate);
    }

    const updated = await this.repository.update(id, data);

    await this.repository.createTrackingEvent({
      shipmentId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: dto.status,
      location: dto.location ?? null,
      description: dto.description,
      source,
      changedBy: source === 'MANUAL' ? userId : null,
    });

    const event = dto.status === ShipmentStatus.DELAYED
      ? SHIPMENT_CONSTANTS.EVENTS.DELAYED
      : SHIPMENT_CONSTANTS.EVENTS.TRACKING_UPDATED;

    await this.eventQueue.enqueue({
      shipmentId: id,
      shipmentNumber: updated['shipmentNumber'] as string,
      workspaceId,
      event,
    });

    return this.mapToResponse(updated);
  }

  // ── Deliver ───────────────────────────────────────────────────

  async deliver(
    id: string,
    workspaceId: string,
    dto: DeliverShipmentDto,
    userId: string,
  ): Promise<ShipmentResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ShipmentStatus, ShipmentStatus.DELIVERED);

    const updated = await this.repository.update(id, {
      status: ShipmentStatus.DELIVERED,
      actualDeliveryDate: dto.actualDeliveryDate ? new Date(dto.actualDeliveryDate) : new Date(),
      lastTrackedAt: new Date(),
    });

    await this.repository.createTrackingEvent({
      shipmentId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: ShipmentStatus.DELIVERED,
      location: null,
      description: dto.notes ?? 'Shipment delivered',
      source: 'MANUAL',
      changedBy: userId,
    });

    await this.eventQueue.enqueue({
      shipmentId: id,
      shipmentNumber: updated['shipmentNumber'] as string,
      workspaceId,
      event: SHIPMENT_CONSTANTS.EVENTS.DELIVERED,
    });

    this.logger.log(`Shipment delivered: ${updated['shipmentNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Cancel ────────────────────────────────────────────────────

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelShipmentDto,
    userId: string,
  ): Promise<ShipmentResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ShipmentStatus, ShipmentStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: ShipmentStatus.CANCELLED,
      cancelReason: dto.reason,
    });

    await this.repository.createTrackingEvent({
      shipmentId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: ShipmentStatus.CANCELLED,
      location: null,
      description: `Cancelled: ${dto.reason}`,
      source: 'MANUAL',
      changedBy: userId,
    });

    await this.eventQueue.enqueue({
      shipmentId: id,
      shipmentNumber: updated['shipmentNumber'] as string,
      workspaceId,
      event: SHIPMENT_CONSTANTS.EVENTS.CANCELLED,
    });

    this.logger.log(`Shipment cancelled: ${updated['shipmentNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Bulk tracking sync trigger ────────────────────────────────

  async scheduleTrackingSync(workspaceId: string): Promise<{ queued: number }> {
    const trackable = await this.repository.findTrackableShipments(workspaceId);
    await Promise.all(
      trackable.map((s) =>
        this.syncQueue.enqueue({
          shipmentId: s['id'] as string,
          shipmentNumber: s['shipmentNumber'] as string,
          workspaceId,
          trackingNumber: s['trackingNumber'] as string,
          carrier: s['carrier'] as string,
        }),
      ),
    );
    this.logger.log(`Queued tracking sync for ${trackable.length} active shipments`);
    return { queued: trackable.length };
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: ShipmentFilterDto): Promise<ShipmentListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<ShipmentResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    return this.repository.getStats(workspaceId);
  }

  async getTrackingHistory(
    id: string,
    workspaceId: string,
  ): Promise<ShipmentTrackingHistoryResponseDto[]> {
    await this.getOrThrow(id, workspaceId);
    const records = await this.repository.findTrackingHistory(id, workspaceId);
    return records.map((r) => ({
      id: r['id'] as string,
      shipmentId: r['shipmentId'] as string,
      fromStatus: r['fromStatus'] as ShipmentStatus,
      toStatus: r['toStatus'] as ShipmentStatus,
      location: r['location'] as string | null,
      description: r['description'] as string,
      source: r['source'] as string,
      changedBy: r['changedBy'] as string | null,
      createdAt: r['createdAt'] as Date,
    }));
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.getOrThrow(id, workspaceId);
    const nonDeletable: ShipmentStatus[] = [ShipmentStatus.DISPATCHED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY];
    if (nonDeletable.includes(record['status'] as ShipmentStatus)) {
      throw new BadRequestException(`Cannot delete a shipment in ${record['status']} status`);
    }
    await this.repository.softDelete(id);
    this.logger.log(`Shipment soft-deleted: ${record['shipmentNumber']}`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private assertTransition(from: ShipmentStatus, to: ShipmentStatus): void {
    const allowed = SHIPMENT_CONSTANTS.ALLOWED_TRANSITIONS[from] as ShipmentStatus[];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot transition shipment from ${from} to ${to}`);
    }
  }

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Shipment not found: ${id}`);
    return record;
  }

  private mapToResponse(r: Record<string, unknown>): ShipmentResponseDto {
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      shipmentNumber: r['shipmentNumber'] as string,
      purchaseOrderId: r['purchaseOrderId'] as string | null,
      supplierId: r['supplierId'] as string | null,
      status: r['status'] as ShipmentStatus,
      isPartial: r['isPartial'] as boolean,
      carrier: r['carrier'] as string | null,
      trackingNumber: r['trackingNumber'] as string | null,
      shipmentMethod: r['shipmentMethod'] as string | null,
      origin: r['origin'] as ShipmentAddress | null,
      destination: r['destination'] as ShipmentAddress | null,
      dispatchDate: r['dispatchDate'] as Date | null,
      estimatedDeliveryDate: r['estimatedDeliveryDate'] as Date | null,
      actualDeliveryDate: r['actualDeliveryDate'] as Date | null,
      shippingCost: r['shippingCost'] as number | null,
      currency: r['currency'] as string | null,
      totalWeight: r['totalWeight'] as number | null,
      weightUnit: r['weightUnit'] as string | null,
      packages: r['packages'] as ShipmentPackage[] | null,
      notes: r['notes'] as string | null,
      attachments: r['attachments'] as ShipmentAttachment[] | null,
      lastTrackedAt: r['lastTrackedAt'] as Date | null,
      cancelReason: r['cancelReason'] as string | null,
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }
}
