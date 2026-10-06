import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  TaxCalculationRecordFilterOptions,
  TaxJurisdictionFilterOptions,
  TaxRuleFilterOptions,
} from '../interfaces';
import { TAX_CONSTANTS } from '../constants';

@Injectable()
export class TaxRepository extends BaseRepository {
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

  // ── Jurisdiction ──────────────────────────────────────────

  async createJurisdiction(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxJurisdiction', 'create', { data });
  }

  async findJurisdictionById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('taxJurisdiction', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findJurisdictionByCode(code: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('taxJurisdiction', 'findFirst', {
      where: { code: code.toUpperCase(), deletedAt: null },
    });
  }

  async findJurisdictions(filter: TaxJurisdictionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.countryCode) where['countryCode'] = filter.countryCode.toUpperCase();
    if (filter.level) where['level'] = filter.level;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search.toUpperCase() } },
      ];
    }
    const take = Math.min(filter.limit ?? TAX_CONSTANTS.DEFAULT_PAGE_SIZE, TAX_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('taxJurisdiction', 'findMany', { where, orderBy: { code: 'asc' }, take, skip }),
      this.call<number>('taxJurisdiction', 'count', { where }),
    ]);
    return [items, total];
  }

  async updateJurisdiction(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxJurisdiction', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Rule ────────────────────────────────────────────────────

  async createRule(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxRule', 'create', { data });
  }

  async findRuleById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('taxRule', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async updateRule(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxRule', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findRules(filter: TaxRuleFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.ruleKey) where['ruleKey'] = filter.ruleKey;
    if (filter.taxType) where['taxType'] = filter.taxType;
    if (filter.jurisdictionCode) where['jurisdictionCode'] = filter.jurisdictionCode.toUpperCase();
    if (filter.status) where['status'] = filter.status;
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;

    const sortField = TAX_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'priority'] ?? 'priority';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };
    const take = Math.min(filter.limit ?? TAX_CONSTANTS.DEFAULT_PAGE_SIZE, TAX_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('taxRule', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('taxRule', 'count', { where }),
    ]);
    return [items, total];
  }

  /**
   * Finds every PUBLISHED rule applicable at `effectiveDate` for a
   * jurisdiction (optionally narrowed by tax type), merging global
   * (workspaceId=null) and workspace-scoped rules — a workspace-scoped
   * rule for the same ruleKey takes precedence over the global one.
   */
  async findEffectiveRules(
    jurisdictionCode: string,
    effectiveDate: Date,
    workspaceId?: string | null,
    taxType?: string | null,
  ): Promise<Record<string, unknown>[]> {
    const baseWhere: Record<string, unknown> = {
      jurisdictionCode: jurisdictionCode.toUpperCase(),
      status: 'PUBLISHED',
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }],
      deletedAt: null,
      ...(taxType ? { taxType } : {}),
    };

    const [globalRules, workspaceRules] = await Promise.all([
      this.call<Record<string, unknown>[]>('taxRule', 'findMany', {
        where: { ...baseWhere, workspaceId: null },
        orderBy: { priority: 'asc' },
      }),
      workspaceId
        ? this.call<Record<string, unknown>[]>('taxRule', 'findMany', {
            where: { ...baseWhere, workspaceId },
            orderBy: { priority: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const byKey = new Map<string, Record<string, unknown>>();
    for (const rule of globalRules) byKey.set(rule['ruleKey'] as string, rule);
    for (const rule of workspaceRules) byKey.set(rule['ruleKey'] as string, rule); // workspace-scoped wins

    return [...byKey.values()].sort((a, b) => (a['priority'] as number) - (b['priority'] as number));
  }

  /** Any conflicting rule for the same ruleKey/jurisdiction/workspace whose effective window overlaps the candidate's. */
  async findOverlappingRules(
    ruleKey: string,
    jurisdictionCode: string,
    workspaceId: string | null,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeId?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('taxRule', 'findMany', {
      where: {
        ruleKey,
        jurisdictionCode: jurisdictionCode.toUpperCase(),
        workspaceId,
        status: { in: ['PUBLISHED', 'APPROVED', 'PENDING_APPROVAL'] },
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        effectiveFrom: { lte: effectiveTo ?? new Date('9999-12-31') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
    });
  }

  // ── Rule History ──────────────────────────────────────────

  async createRuleHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxRuleHistory', 'create', { data });
  }

  async findRuleHistory(ruleId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('taxRuleHistory', 'findMany', {
      where: { ruleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findRuleHistoryByVersion(ruleId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('taxRuleHistory', 'findFirst', {
      where: { ruleId, version },
    });
  }

  // ── Overrides ─────────────────────────────────────────────

  async createOverride(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxOverride', 'create', { data });
  }

  async findOverrides(
    jurisdictionCode: string,
    taxType: string | null,
    workspaceId?: string | null,
    organizationId?: string | null,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('taxOverride', 'findMany', {
      where: {
        deletedAt: null,
        OR: [
          { jurisdictionCode: null },
          { jurisdictionCode: jurisdictionCode.toUpperCase() },
        ],
        AND: [
          { OR: [{ taxType: null }, ...(taxType ? [{ taxType }] : [])] },
          {
            OR: [
              { workspaceId: null, organizationId: null },
              ...(organizationId ? [{ organizationId }] : []),
              ...(workspaceId ? [{ workspaceId }] : []),
            ],
          },
        ],
      },
      orderBy: { priority: 'desc' },
    });
  }

  // ── Calculation Records (immutable) ────────────────────────

  async createCalculationRecord(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('taxCalculationRecord', 'create', { data });
  }

  async findCalculationRecords(
    filter: TaxCalculationRecordFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId) where['workspaceId'] = filter.workspaceId;
    if (filter.transactionType) where['transactionType'] = filter.transactionType;
    if (filter.transactionRef) where['transactionRef'] = filter.transactionRef;
    if (filter.jurisdictionCode) where['jurisdictionCode'] = filter.jurisdictionCode.toUpperCase();
    if (filter.fromDate || filter.toDate) {
      where['calculatedAt'] = {
        ...(filter.fromDate ? { gte: filter.fromDate } : {}),
        ...(filter.toDate ? { lte: filter.toDate } : {}),
      };
    }

    const take = Math.min(filter.limit ?? TAX_CONSTANTS.DEFAULT_PAGE_SIZE, TAX_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('taxCalculationRecord', 'findMany', {
        where,
        orderBy: { calculatedAt: 'desc' },
        take,
        skip,
      }),
      this.call<number>('taxCalculationRecord', 'count', { where }),
    ]);
    return [items, total];
  }
}
