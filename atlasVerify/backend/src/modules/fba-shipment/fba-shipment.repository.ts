import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { FBAShipmentFilterDto } from './dto';

const FBA_SHIPMENT_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  shipmentNumber: 'shipmentNumber',
  status: 'status',
  priority: 'priority',
  shipmentType: 'shipmentType',
  totalUnits: 'totalUnits',
  plannedAt: 'plannedAt',
  shippedAt: 'shippedAt',
};

@Injectable()
export class FBAShipmentRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'fBAShipment'
    ] as Record<string, unknown>;
  }

  private get itemModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'fBAShipmentItem'
    ] as Record<string, unknown>;
  }

  private get boxModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'fBAShipmentBox'
    ] as Record<string, unknown>;
  }

  private get boxContentModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'fBAShipmentBoxContent'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'fBAShipmentHistory'
    ] as Record<string, unknown>;
  }

  private get discrepancyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'fBAReceivingDiscrepancy'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callItem<T>(method: string, args: unknown): Promise<T> {
    return (this.itemModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callBox<T>(method: string, args: unknown): Promise<T> {
    return (this.boxModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callBoxContent<T>(method: string, args: unknown): Promise<T> {
    return (this.boxContentModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callDiscrepancy<T>(method: string, args: unknown): Promise<T> {
    return (this.discrepancyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId },
      orderBy: { shipmentSequence: 'desc' },
      select: { shipmentSequence: true },
    });
    return ((last?.['shipmentSequence'] as number) ?? 0) + 1;
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', {
      data,
      include: { items: true, boxes: true, discrepancies: true },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
      include: { items: true, boxes: { include: { contents: true } }, discrepancies: true },
    });
  }

  async findByNumber(
    shipmentNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { shipmentNumber, workspaceId, deletedAt: null },
      include: { items: true, boxes: { include: { contents: true } }, discrepancies: true },
    });
  }

  async findByExternalId(
    externalShipmentId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { externalShipmentId, workspaceId, deletedAt: null },
      include: { items: true, boxes: { include: { contents: true } }, discrepancies: true },
    });
  }

  async findAll(
    workspaceId: string,
    filter: FBAShipmentFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
    };

    if (filter.marketplaceAccountId) {
      where['marketplaceAccountId'] = filter.marketplaceAccountId;
    }

    if (filter.warehouseId) {
      where['warehouseId'] = filter.warehouseId;
    }

    if (filter.status) {
      where['status'] = filter.status;
    }

    if (filter.shipmentType) {
      where['shipmentType'] = filter.shipmentType;
    }

    if (filter.externalShipmentId) {
      where['externalShipmentId'] = filter.externalShipmentId;
    }

    if (filter.externalPlanId) {
      where['externalPlanId'] = filter.externalPlanId;
    }

    if (filter.destinationFCId) {
      where['destinationFCId'] = filter.destinationFCId;
    }

    if (filter.packingTaskId) {
      where['packingTaskId'] = filter.packingTaskId;
    }

    if (filter.dispatchTaskId) {
      where['dispatchTaskId'] = filter.dispatchTaskId;
    }

    if (filter.transferId) {
      where['transferId'] = filter.transferId;
    }

    if (filter.search) {
      where['OR'] = [
        { shipmentNumber: { contains: filter.search, mode: 'insensitive' } },
        { externalShipmentId: { contains: filter.search, mode: 'insensitive' } },
        { externalShipmentName: { contains: filter.search, mode: 'insensitive' } },
        { destinationFCId: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const sortBy = filter.sortBy && FBA_SHIPMENT_SORT_FIELDS[filter.sortBy]
      ? FBA_SHIPMENT_SORT_FIELDS[filter.sortBy]
      : 'createdAt';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        include: { items: true, boxes: true, discrepancies: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.call<number>('count', { where }),
    ]);

    return [data, total];
  }

  async update(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
      include: { items: true, boxes: { include: { contents: true } }, discrepancies: true },
    });
  }

  async createItem(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callItem<Record<string, unknown>>('create', { data });
  }

  async findItemById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callItem<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findItemsByShipment(shipmentId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callItem<Record<string, unknown>[]>('findMany', {
      where: { shipmentId, workspaceId },
      orderBy: { lineNumber: 'asc' },
    });
  }

  async updateItem(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callItem<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async createBox(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callBox<Record<string, unknown>>('create', {
      data,
      include: { contents: true },
    });
  }

  async findBoxById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callBox<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
      include: { contents: true },
    });
  }

  async findBoxesByShipment(shipmentId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callBox<Record<string, unknown>[]>('findMany', {
      where: { shipmentId, workspaceId },
      include: { contents: true },
      orderBy: { boxSequence: 'asc' },
    });
  }

  async updateBox(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callBox<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
      include: { contents: true },
    });
  }

  async getNextBoxSequence(shipmentId: string): Promise<number> {
    const last = await this.callBox<Record<string, unknown> | null>('findFirst', {
      where: { shipmentId },
      orderBy: { boxSequence: 'desc' },
      select: { boxSequence: true },
    });
    return ((last?.['boxSequence'] as number) ?? 0) + 1;
  }

  async createBoxContent(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callBoxContent<Record<string, unknown>>('create', { data });
  }

  async findBoxContentByBoxAndItem(
    boxId: string,
    itemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callBoxContent<Record<string, unknown> | null>('findFirst', {
      where: { boxId, itemId, workspaceId },
    });
  }

  async updateBoxContent(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callBoxContent<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<Record<string, unknown>>('create', { data });
  }

  async createDiscrepancy(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callDiscrepancy<Record<string, unknown>>('create', { data });
  }

  async findDiscrepancyById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callDiscrepancy<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findDiscrepanciesByShipment(
    shipmentId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callDiscrepancy<Record<string, unknown>[]>('findMany', {
      where: { shipmentId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDiscrepancy(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callDiscrepancy<Record<string, unknown>>('update', {
      where: { id, workspaceId },
      data,
    });
  }
}
