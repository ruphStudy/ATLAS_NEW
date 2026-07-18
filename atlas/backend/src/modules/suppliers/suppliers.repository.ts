import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { SupplierFilterDto } from './dto';

@Injectable()
export class SuppliersRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessors ──────────────────────────────────────────

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'supplier'
    ] as Record<string, unknown>;
  }

  private get statusHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'supplierStatusHistory'
    ] as Record<string, unknown>;
  }

  private get profileHistoryModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'supplierProfileHistory'
    ] as Record<string, unknown>;
  }

  private get providerIdentityModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'supplierProviderIdentity'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findAll(
    workspaceId: string,
    filter: SupplierFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const where: Record<string, unknown> = { workspaceId, deletedAt: null };

    if (filter.status?.length) where['managementStatus'] = { in: filter.status };
    if (filter.country) where['country'] = filter.country.toUpperCase();
    if (filter.provider) where['provider'] = filter.provider;
    if (filter.minVerificationScore !== undefined) where['verificationScore'] = { gte: filter.minVerificationScore };
    if (filter.minPerformanceScore !== undefined) where['performanceScore'] = { gte: filter.minPerformanceScore };
    if (filter.category) where['categories'] = { has: filter.category };
    if (filter.tags?.length) where['tags'] = { hasSome: filter.tags };

    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { contactEmail: { contains: filter.search, mode: 'insensitive' } },
        { contactPhone: { contains: filter.search, mode: 'insensitive' } },
        { legalName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      (this.model['findMany'] as (a: unknown) => Promise<unknown[]>)({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      (this.model['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);

    return [items as Record<string, unknown>[], total];
  }

  // ── Duplicate detection ──────────────────────────────────────

  async findDuplicate(
    workspaceId: string,
    fields: {
      email?: string;
      phone?: string;
      website?: string;
      name?: string;
      country?: string;
      providerSupplierId?: string;
      provider?: string;
    },
  ): Promise<Record<string, unknown> | null> {
    const conditions: Record<string, unknown>[] = [];

    if (fields.email) conditions.push({ contactEmail: fields.email, workspaceId, deletedAt: null });
    if (fields.phone) conditions.push({ contactPhone: fields.phone, workspaceId, deletedAt: null });
    if (fields.website) conditions.push({ website: fields.website, workspaceId, deletedAt: null });
    if (fields.name && fields.country) {
      conditions.push({
        name: { equals: fields.name, mode: 'insensitive' },
        country: fields.country.toUpperCase(),
        workspaceId,
        deletedAt: null,
      });
    }
    if (fields.provider && fields.providerSupplierId) {
      conditions.push({ provider: fields.provider, providerSupplierId: fields.providerSupplierId, workspaceId, deletedAt: null });
    }

    if (!conditions.length) return null;
    return this.call<Record<string, unknown> | null>('findFirst', { where: { OR: conditions } });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Soft delete ──────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<void>('update', { where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Status history ───────────────────────────────────────────

  async createStatusHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return (this.statusHistoryModel['create'] as (a: unknown) => Promise<Record<string, unknown>>)({ data });
  }

  async findStatusHistory(supplierId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return (this.statusHistoryModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: { supplierId, workspaceId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Record<string, unknown>[]>;
  }

  // ── Profile history ──────────────────────────────────────────

  async createProfileHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return (this.profileHistoryModel['create'] as (a: unknown) => Promise<Record<string, unknown>>)({ data });
  }

  async findProfileHistory(supplierId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return (this.profileHistoryModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: { supplierId, workspaceId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Record<string, unknown>[]>;
  }

  // ── Statistics ───────────────────────────────────────────────

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    const statuses = ['PROSPECT', 'ACTIVE', 'PREFERRED', 'SUSPENDED', 'REJECTED', 'ARCHIVED'];

    const [total, ...counts] = await Promise.all([
      (this.model['count'] as (a: unknown) => Promise<number>)({ where: { workspaceId, deletedAt: null } }),
      ...statuses.map((s) =>
        (this.model['count'] as (a: unknown) => Promise<number>)({
          where: { workspaceId, managementStatus: s, deletedAt: null },
        }),
      ),
    ]);

    return statuses.reduce(
      (acc, s, i) => ({ ...acc, [s.toLowerCase()]: counts[i] }),
      { total } as Record<string, number>,
    );
  }

  // ── Provider identities ──────────────────────────────────────

  async upsertProviderIdentity(data: {
    supplierId: string;
    workspaceId: string;
    providerCode: string;
    providerSupplierId: string;
    providerUrl?: string | null;
    syncedAt?: Date | null;
    rawData?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    return (this.providerIdentityModel['upsert'] as (a: unknown) => Promise<Record<string, unknown>>)({
      where: { supplierId_providerCode: { supplierId: data.supplierId, providerCode: data.providerCode } },
      create: { ...data, rawData: data.rawData ?? {} },
      update: {
        providerSupplierId: data.providerSupplierId,
        providerUrl: data.providerUrl,
        syncedAt: data.syncedAt,
        rawData: data.rawData ?? {},
        updatedAt: new Date(),
      },
    });
  }

  async findByProviderIdentity(
    workspaceId: string,
    providerCode: string,
    providerSupplierId: string,
  ): Promise<Record<string, unknown> | null> {
    return (this.providerIdentityModel['findFirst'] as (a: unknown) => Promise<Record<string, unknown> | null>)({
      where: { workspaceId, providerCode, providerSupplierId },
      include: { supplier: true },
    });
  }

  async findProviderIdentities(supplierId: string): Promise<Record<string, unknown>[]> {
    return (this.providerIdentityModel['findMany'] as (a: unknown) => Promise<Record<string, unknown>[]>)({
      where: { supplierId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
