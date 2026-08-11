import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { InventoryTransferFilterDto } from '../dto';

@Injectable()
export class InventoryTransferRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransfer'
    ] as Record<string, unknown>;
  }

  private get lineModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransferLine'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'inventoryTransferHistory'
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

  async generateTransferNumber(workspaceId: string): Promise<string> {
    const count = await this.call<number>('count', {
      where: { workspaceId },
    });
    const sequence = count + 1;
    return `TRF-${sequence.toString().padStart(7, '0')}`;
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { 
      data,
      include: { lines: true },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
      include: { lines: true },
    });
  }

  async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId, idempotencyKey },
      include: { lines: true },
    });
  }

  async findAll(
    workspaceId: string,
    filter: InventoryTransferFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.sourceWarehouseId && { sourceWarehouseId: filter.sourceWarehouseId }),
      ...(filter.destinationWarehouseId && { destinationWarehouseId: filter.destinationWarehouseId }),
      ...(filter.idempotencyKey && { idempotencyKey: filter.idempotencyKey }),
    };

    if (filter.inventoryItemId) {
      where['lines'] = {
        some: { inventoryItemId: filter.inventoryItemId },
      };
    }

    if (filter.search) {
      where['OR'] = [
        { transferNumber: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
        { shipmentReference: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = filter.sortBy === 'transferNumber' ? 'transferNumber' : 'createdAt';
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
      data: { ...data, updatedAt: new Date() },
      include: { lines: true },
    });
  }

  async findLineById(lineId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.callLine<Record<string, unknown> | null>('findFirst', {
      where: { id: lineId, workspaceId },
    });
  }

  async updateLine(lineId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callLine<Record<string, unknown>>('update', {
      where: { id: lineId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findLinesByTransferId(transferId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callLine<Record<string, unknown>[]>('findMany', {
      where: { transferId, workspaceId },
    });
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  async findHistory(transferId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { transferId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
