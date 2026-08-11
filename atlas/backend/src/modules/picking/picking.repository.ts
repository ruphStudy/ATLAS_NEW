import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { PickingFilterDto } from './dto';

const PICKING_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  taskNumber: 'taskNumber',
  status: 'status',
  priority: 'priority',
  pickingType: 'pickingType',
};

@Injectable()
export class PickingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'pickingTask'
    ] as Record<string, unknown>;
  }

  private get lineModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'pickingTaskLine'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'pickingTaskHistory'
    ] as Record<string, unknown>;
  }

  private get exceptionModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'pickingException'
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

  private callException<T>(method: string, args: unknown): Promise<T> {
    return (this.exceptionModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<Record<string, unknown> | null>('findFirst', {
      where: { workspaceId },
      orderBy: { taskSequence: 'desc' },
      select: { taskSequence: true },
    });
    return ((last?.['taskSequence'] as number) ?? 0) + 1;
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', {
      data,
      include: { lines: true, exceptions: true },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
      include: { lines: true, exceptions: true },
    });
  }

  async findByNumber(
    taskNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { taskNumber, workspaceId, deletedAt: null },
      include: { lines: true, exceptions: true },
    });
  }

  async findAll(
    workspaceId: string,
    filter: PickingFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.pickingType && { pickingType: filter.pickingType }),
      ...(filter.strategy && { strategy: filter.strategy }),
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
      ...(filter.orderId && { orderId: filter.orderId }),
      ...(filter.transferId && { transferId: filter.transferId }),
      ...(filter.assignedTo && { assignedTo: filter.assignedTo }),
      ...(filter.waveId && { waveId: filter.waveId }),
      ...(filter.batchId && { batchId: filter.batchId }),
    };

    if (filter.search) {
      where['OR'] = [
        { taskNumber: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = PICKING_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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
      include: { lines: true, exceptions: true },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
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
    taskId: string,
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

  async createException(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callException<Record<string, unknown>>('create', { data });
  }

  async findExceptions(taskId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callException<Record<string, unknown>[]>('findMany', {
      where: { taskId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
