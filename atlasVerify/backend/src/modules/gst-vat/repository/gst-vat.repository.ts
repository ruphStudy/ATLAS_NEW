import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  GstVatRegistrationFilterOptions,
  GstVatTaxCodeFilterOptions,
  GstVatTransactionFilterOptions,
} from '../interfaces';
import { GST_VAT_CONSTANTS } from '../constants';

@Injectable()
export class GstVatRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Internal Helpers ──────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Registration ──────────────────────────────────────────

  async createRegistration(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatRegistration', 'create', { data });
  }

  async findRegistrationById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('gstVatRegistration', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findRegistration(
    workspaceId: string,
    jurisdictionCode: string,
    taxType: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('gstVatRegistration', 'findFirst', {
      where: { workspaceId, jurisdictionCode: jurisdictionCode.toUpperCase(), taxType, deletedAt: null },
    });
  }

  async findRegistrations(filter: GstVatRegistrationFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.jurisdictionCode) where['jurisdictionCode'] = filter.jurisdictionCode.toUpperCase();
    if (filter.taxType) where['taxType'] = filter.taxType;
    if (filter.status) where['status'] = filter.status;

    const take = Math.min(filter.limit ?? GST_VAT_CONSTANTS.DEFAULT_PAGE_SIZE, GST_VAT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('gstVatRegistration', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('gstVatRegistration', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateRegistration(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatRegistration', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async createRegistrationHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatRegistrationHistory', 'create', { data });
  }

  async findRegistrationHistory(registrationId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('gstVatRegistrationHistory', 'findMany', {
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Tax Codes ─────────────────────────────────────────────

  async createTaxCode(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatTaxCode', 'create', { data });
  }

  async findTaxCodeById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('gstVatTaxCode', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  /** Prefers a workspace-scoped code over the global one for the same code + jurisdiction. */
  async findTaxCode(
    code: string,
    jurisdictionCode: string | null,
    workspaceId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    if (workspaceId) {
      const scoped = await this.call<Record<string, unknown> | null>('gstVatTaxCode', 'findFirst', {
        where: { code, jurisdictionCode, workspaceId, deletedAt: null },
      });
      if (scoped) return scoped;
    }
    return this.call<Record<string, unknown> | null>('gstVatTaxCode', 'findFirst', {
      where: { code, jurisdictionCode, workspaceId: null, deletedAt: null },
    });
  }

  async findTaxCodes(filter: GstVatTaxCodeFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.code) where['code'] = filter.code;
    if (filter.taxType) where['taxType'] = filter.taxType;
    if (filter.jurisdictionCode) where['jurisdictionCode'] = filter.jurisdictionCode.toUpperCase();
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.status) where['status'] = filter.status;

    const take = Math.min(filter.limit ?? GST_VAT_CONSTANTS.DEFAULT_PAGE_SIZE, GST_VAT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('gstVatTaxCode', 'findMany', { where, orderBy: { code: 'asc' }, take, skip }),
      this.call<number>('gstVatTaxCode', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateTaxCode(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatTaxCode', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Transactions ──────────────────────────────────────────

  async createTransaction(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatTransaction', 'create', { data });
  }

  async findTransactionById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('gstVatTransaction', 'findFirst', { where: { id } });
  }

  async findTransactions(filter: GstVatTransactionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.direction) where['direction'] = filter.direction;
    if (filter.transactionType) where['transactionType'] = filter.transactionType;
    if (filter.transactionRef) where['transactionRef'] = filter.transactionRef;
    if (filter.fromDate || filter.toDate) {
      where['createdAt'] = {
        ...(filter.fromDate ? { gte: filter.fromDate } : {}),
        ...(filter.toDate ? { lte: filter.toDate } : {}),
      };
    }

    const take = Math.min(filter.limit ?? GST_VAT_CONSTANTS.DEFAULT_PAGE_SIZE, GST_VAT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('gstVatTransaction', 'findMany', {
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('gstVatTransaction', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateTransactionStatus(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatTransaction', 'update', { where: { id }, data });
  }

  // ── Adjustments ───────────────────────────────────────────

  async createAdjustment(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('gstVatAdjustment', 'create', { data });
  }

  async findAdjustmentsByTransaction(originalTransactionId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('gstVatAdjustment', 'findMany', {
      where: { originalTransactionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
