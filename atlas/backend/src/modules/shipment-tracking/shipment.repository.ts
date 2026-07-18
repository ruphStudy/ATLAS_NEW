import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ShipmentStatus } from './interfaces';
import type { ShipmentFilterDto } from './dto';

@Injectable()
export class ShipmentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'shipment'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'shipmentTrackingHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Sequence ─────────────────────────────────────────────────

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<{ shipmentSequence: number } | null>('findFirst', {
      where: { workspaceId },
      orderBy: { shipmentSequence: 'desc' },
      select: { shipmentSequence: true },
    });
    return last ? last.shipmentSequence + 1 : 1;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async createTrackingEvent(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByTrackingNumber(
    trackingNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { trackingNumber, workspaceId, deletedAt: null },
    });
  }

  async findTrackableShipments(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: {
        workspaceId,
        deletedAt: null,
        trackingNumber: { not: null },
        carrier: { not: null },
        status: {
          in: [
            ShipmentStatus.DISPATCHED,
            ShipmentStatus.IN_TRANSIT,
            ShipmentStatus.CUSTOMS_CLEARANCE,
            ShipmentStatus.OUT_FOR_DELIVERY,
            ShipmentStatus.DELAYED,
          ],
        },
      },
      select: {
        id: true,
        shipmentNumber: true,
        workspaceId: true,
        trackingNumber: true,
        carrier: true,
      },
    });
  }

  async findAll(
    workspaceId: string,
    filter: ShipmentFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.purchaseOrderId && { purchaseOrderId: filter.purchaseOrderId }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.carrier && { carrier: { contains: filter.carrier, mode: 'insensitive' } }),
      ...(filter.trackingNumber && { trackingNumber: { contains: filter.trackingNumber, mode: 'insensitive' } }),
    };

    if (filter.search) {
      where['OR'] = [
        { shipmentNumber: { contains: filter.search, mode: 'insensitive' } },
        { trackingNumber: { contains: filter.search, mode: 'insensitive' } },
        { carrier: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy: { [filter.sortBy ?? 'createdAt']: filter.sortOrder ?? 'desc' },
      }),
      this.call<number>('count', { where }),
    ]);

    return [items, total];
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    const statuses = Object.values(ShipmentStatus);
    const counts = await Promise.all(
      statuses.map((s) =>
        this.call<number>('count', { where: { workspaceId, status: s, deletedAt: null } }),
      ),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  async findTrackingHistory(shipmentId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { shipmentId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', { where: { id }, data });
  }

  // ── Soft delete ───────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
