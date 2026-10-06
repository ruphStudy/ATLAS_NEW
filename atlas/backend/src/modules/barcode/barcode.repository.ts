import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { BarcodeFilterDto, LabelTemplateFilterDto } from './dto';
import { BarcodeEntityType, BarcodeStatus } from './interfaces';

const BARCODE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  value: 'value',
  status: 'status',
};

const TEMPLATE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
};

@Injectable()
export class BarcodeRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'barcode'
    ] as Record<string, unknown>;
  }

  private get scanHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'barcodeScanHistory'
    ] as Record<string, unknown>;
  }

  private get printHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'labelPrintHistory'
    ] as Record<string, unknown>;
  }

  private get templateModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'labelTemplate'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callScanHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.scanHistoryModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callPrintHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.printHistoryModel[method] as (a: unknown) => Promise<T>)(args);
  }

  private callTemplate<T>(method: string, args: unknown): Promise<T> {
    return (this.templateModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findByValue(
    value: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { value, workspaceId },
    });
  }

  async findActiveByEntity(
    entityType: BarcodeEntityType,
    entityId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        entityType,
        entityId,
        workspaceId,
        status: BarcodeStatus.ACTIVE,
      },
    });
  }

  async findAll(
    workspaceId: string,
    filter: BarcodeFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.entityType && { entityType: filter.entityType }),
      ...(filter.entityId && { entityId: filter.entityId }),
      ...(filter.value && { value: { contains: filter.value, mode: 'insensitive' } }),
    };

    if (filter.search) {
      where['value'] = { contains: filter.search, mode: 'insensitive' };
    }

    const sortField = BARCODE_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
      }),
      this.call<number>('count', { where }),
    ]);

    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data,
    });
  }

  async createScanHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callScanHistory<Record<string, unknown>>('create', { data });
  }

  async createPrintHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callPrintHistory<Record<string, unknown>>('create', { data });
  }

  async createTemplate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callTemplate<Record<string, unknown>>('create', { data });
  }

  async findTemplateById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callTemplate<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findDefaultTemplate(
    entityType: BarcodeEntityType,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callTemplate<Record<string, unknown> | null>('findFirst', {
      where: { entityType, workspaceId, isDefault: true },
    });
  }

  async findAllTemplates(
    workspaceId: string,
    filter: LabelTemplateFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.entityType && { entityType: filter.entityType }),
    };

    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = TEMPLATE_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.callTemplate<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
      }),
      this.callTemplate<number>('count', { where }),
    ]);

    return [items, total];
  }

  async updateTemplate(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callTemplate<Record<string, unknown>>('update', {
      where: { id },
      data,
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.callTemplate<unknown>('delete', {
      where: { id },
    });
  }
}
