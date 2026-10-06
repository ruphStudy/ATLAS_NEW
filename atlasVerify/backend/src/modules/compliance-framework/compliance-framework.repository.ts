import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ComplianceRecordFilterOptions,
  ComplianceRecordStatus,
  ComplianceRuleFilterOptions,
  ComplianceRuleStatus,
  IComplianceRecord,
  IComplianceRecordHistory,
  IComplianceRequirementRule,
  IComplianceRequirementRuleHistory,
} from './interfaces';
import { COMPLIANCE_EXPIRY_SCAN_LIMIT } from './constants';

/**
 * ComplianceFrameworkRepository — the only layer that touches `PrismaService`
 * for compliance requirement rules and compliance records. Evidence file
 * bytes are never touched here — those stay in Document Management,
 * referenced only via `ComplianceRecord.evidenceDocumentId`.
 */
@Injectable()
export class ComplianceFrameworkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Rules ────────────────────────────────────────────────────────

  async createRule(data: Partial<IComplianceRequirementRule>): Promise<IComplianceRequirementRule> {
    return this.prisma.complianceRequirementRule.create({ data: data as any }) as Promise<IComplianceRequirementRule>;
  }

  async findRuleById(id: string): Promise<IComplianceRequirementRule | null> {
    return this.prisma.complianceRequirementRule.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IComplianceRequirementRule | null>;
  }

  /** Finds a non-archived rule with the exact same key + scope combination — used to detect duplicates. */
  async findRuleByScope(
    key: string,
    workspaceId: string | null,
    scope: {
      countryCode?: string | null;
      region?: string | null;
      marketplaceKey?: string | null;
      productCategory?: string | null;
      supplierId?: string | null;
      warehouseId?: string | null;
      businessType?: string | null;
    },
  ): Promise<IComplianceRequirementRule | null> {
    return this.prisma.complianceRequirementRule.findFirst({
      where: {
        key,
        workspaceId,
        countryCode: scope.countryCode ?? null,
        region: scope.region ?? null,
        marketplaceKey: scope.marketplaceKey ?? null,
        productCategory: scope.productCategory ?? null,
        supplierId: scope.supplierId ?? null,
        warehouseId: scope.warehouseId ?? null,
        businessType: scope.businessType ?? null,
        status: { not: ComplianceRuleStatus.ARCHIVED },
        deletedAt: null,
      },
    }) as Promise<IComplianceRequirementRule | null>;
  }

  async findRules(filter: ComplianceRuleFilterOptions): Promise<[IComplianceRequirementRule[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where.workspaceId = filter.workspaceId;
    if (filter.key) where.key = filter.key;
    if (filter.requirementType) where.requirementType = filter.requirementType;
    if (filter.countryCode) where.countryCode = filter.countryCode;
    if (filter.marketplaceKey) where.marketplaceKey = filter.marketplaceKey;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.complianceRequirementRule.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.complianceRequirementRule.count({ where: where as any }),
    ]);

    return [data as IComplianceRequirementRule[], total];
  }

  /** Active, currently-effective rules for a workspace's pool (workspace-scoped + global defaults). */
  async findActiveRulesForWorkspace(workspaceId: string): Promise<IComplianceRequirementRule[]> {
    const now = new Date();
    return this.prisma.complianceRequirementRule.findMany({
      where: {
        deletedAt: null,
        status: ComplianceRuleStatus.ACTIVE,
        effectiveFrom: { lte: now },
        AND: [
          { OR: [{ workspaceId }, { workspaceId: null }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      } as any,
    }) as Promise<IComplianceRequirementRule[]>;
  }

  async updateRule(id: string, data: Partial<IComplianceRequirementRule>): Promise<IComplianceRequirementRule> {
    return this.prisma.complianceRequirementRule.update({
      where: { id },
      data: data as any,
    }) as Promise<IComplianceRequirementRule>;
  }

  async createRuleHistory(
    data: Partial<IComplianceRequirementRuleHistory>,
  ): Promise<IComplianceRequirementRuleHistory> {
    return this.prisma.complianceRequirementRuleHistory.create({
      data: data as any,
    }) as Promise<IComplianceRequirementRuleHistory>;
  }

  async findRuleHistory(ruleId: string, limit = 20): Promise<IComplianceRequirementRuleHistory[]> {
    return this.prisma.complianceRequirementRuleHistory.findMany({
      where: { ruleId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<IComplianceRequirementRuleHistory[]>;
  }

  // ── Records ──────────────────────────────────────────────────────

  async createRecord(data: Partial<IComplianceRecord>): Promise<IComplianceRecord> {
    return this.prisma.complianceRecord.create({ data: data as any }) as Promise<IComplianceRecord>;
  }

  async findRecordById(id: string, workspaceId: string): Promise<IComplianceRecord | null> {
    return this.prisma.complianceRecord.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IComplianceRecord | null>;
  }

  async findRecord(
    workspaceId: string,
    ruleId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<IComplianceRecord | null> {
    return this.prisma.complianceRecord.findFirst({
      where: { workspaceId, ruleId, subjectType, subjectId, deletedAt: null },
    }) as Promise<IComplianceRecord | null>;
  }

  async findRecordsBySubject(
    workspaceId: string,
    subjectType: string,
    subjectId: string,
  ): Promise<IComplianceRecord[]> {
    return this.prisma.complianceRecord.findMany({
      where: { workspaceId, subjectType, subjectId, deletedAt: null },
    }) as Promise<IComplianceRecord[]>;
  }

  async findRecords(filter: ComplianceRecordFilterOptions): Promise<[IComplianceRecord[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.ruleId) where.ruleId = filter.ruleId;
    if (filter.ruleKey) where.ruleKey = filter.ruleKey;
    if (filter.subjectType) where.subjectType = filter.subjectType;
    if (filter.subjectId) where.subjectId = filter.subjectId;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.complianceRecord.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.complianceRecord.count({ where: where as any }),
    ]);

    return [data as IComplianceRecord[], total];
  }

  async updateRecord(id: string, data: Partial<IComplianceRecord>): Promise<IComplianceRecord> {
    return this.prisma.complianceRecord.update({
      where: { id },
      data: data as any,
    }) as Promise<IComplianceRecord>;
  }

  /** Bounded scan used by the expiry scheduler — one tick can't scan an unbounded table. */
  async findExpiredAsOf(now: Date): Promise<IComplianceRecord[]> {
    return this.prisma.complianceRecord.findMany({
      where: {
        deletedAt: null,
        expiresAt: { lt: now },
        status: {
          notIn: [
            ComplianceRecordStatus.EXPIRED,
            ComplianceRecordStatus.WAIVED,
            ComplianceRecordStatus.NON_APPLICABLE,
            ComplianceRecordStatus.REJECTED,
          ],
        },
      },
      take: COMPLIANCE_EXPIRY_SCAN_LIMIT,
    }) as Promise<IComplianceRecord[]>;
  }

  async findExpiringBetween(from: Date, to: Date): Promise<IComplianceRecord[]> {
    return this.prisma.complianceRecord.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gte: from, lte: to },
        status: ComplianceRecordStatus.COMPLIANT,
      },
      take: COMPLIANCE_EXPIRY_SCAN_LIMIT,
    }) as Promise<IComplianceRecord[]>;
  }

  async createRecordHistory(data: Partial<IComplianceRecordHistory>): Promise<IComplianceRecordHistory> {
    return this.prisma.complianceRecordHistory.create({
      data: data as any,
    }) as Promise<IComplianceRecordHistory>;
  }

  async findRecordHistory(recordId: string, limit = 20): Promise<IComplianceRecordHistory[]> {
    return this.prisma.complianceRecordHistory.findMany({
      where: { recordId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<IComplianceRecordHistory[]>;
  }
}
