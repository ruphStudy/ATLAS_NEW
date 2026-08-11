import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { ReceivingFilterDto } from './dto';
import { ReceivingStatus, ReceiptLineStatus } from './interfaces';

const RECEIVING_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  receivingNumber: 'receivingNumber',
  scheduledDate: 'scheduledDate',
  status: 'status',
};

@Injectable()
export class ReceivingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseReceiving'
    ] as Record<string, unknown>;
  }

  private get lineModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseReceivingLine'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseReceivingHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callLine<T>(method: string, args: unknown): Promise<T> {
    return (this.lineModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId },
      orderBy: { receivingSequence: 'desc' },
      select: { receivingSequence: true },
    });
    return ((last?.['receivingSequence'] as number) ?? 0) + 1;
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', {
      data,
      include: { lines: true },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
      include: { lines: true },
    });
  }

  async findByNumber(
    receivingNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { receivingNumber, workspaceId, deletedAt: null },
      include: { lines: true },
    });
  }

  async findAll(
    workspaceId: string,
    filter: ReceivingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
      ...(filter.purchaseOrderId && { purchaseOrderId: filter.purchaseOrderId }),
      ...(filter.shipmentId && { shipmentId: filter.shipmentId }),
      ...(filter.transferId && { transferId: filter.transferId }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
    };

    if (filter.scheduledFrom || filter.scheduledTo) {
      where['scheduledDate'] = {};
      if (filter.scheduledFrom) {
        (where['scheduledDate'] as Record<string, unknown>)['gte'] = new Date(filter.scheduledFrom);
      }
      if (filter.scheduledTo) {
        (where['scheduledDate'] as Record<string, unknown>)['lte'] = new Date(filter.scheduledTo);
      }
    }

    if (filter.search) {
      where['OR'] = [
        { receivingNumber: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = RECEIVING_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
        include: { lines: true },
      }),
      this.call<number>('count', { where }),
    ]);

    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data,
      include: { lines: true },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createLine(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callLine<Record<string, unknown>>('create', { data });
  }

  async findLine(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callLine<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async updateLine(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callLine<Record<string, unknown>>('update', {
      where: { id },
      data,
    });
  }

  async updateLines(
    receivingId: string,
    updates: Array<{ id: string; data: Record<string, unknown> }>,
  ): Promise<void> {
    await Promise.all(
      updates.map((update) =>
        this.callLine<unknown>('update', {
          where: { id: update.id },
          data: update.data,
        }),
      ),
    );
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }
}
