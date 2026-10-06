import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type {
  ISupplierForVerification,
  ISupplierVerification,
  IVerificationCheckResult,
  IVerificationRules,
  IVerificationWithChecks,
} from './interfaces';
import type { VerificationFilterDto } from './dto';

@Injectable()
export class SupplierVerificationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessors ──────────────────────────────────────────
  private get verificationModel() {
    return (this.prisma as unknown as Record<string, unknown>)['supplierVerification'] as Record<string, unknown>;
  }
  private get checkResultModel() {
    return (this.prisma as unknown as Record<string, unknown>)['verificationCheckResult'] as Record<string, unknown>;
  }
  private get ruleConfigModel() {
    return (this.prisma as unknown as Record<string, unknown>)['verificationRuleConfig'] as Record<string, unknown>;
  }
  private get supplierModel() {
    return (this.prisma as unknown as Record<string, unknown>)['supplier'] as Record<string, unknown>;
  }

  // ── Rule Config ───────────────────────────────────────────────

  async getRuleConfig(workspaceId: string): Promise<IVerificationRules | null> {
    const config = await (this.ruleConfigModel['findUnique'] as (a: unknown) => Promise<unknown>)({
      where: { workspaceId },
    });
    if (!config) return null;
    const c = config as { rules: unknown; scoreThreshold: number };
    return { ...(c.rules as object), scoreThreshold: c.scoreThreshold } as IVerificationRules;
  }

  async upsertRuleConfig(workspaceId: string, rules: IVerificationRules): Promise<void> {
    const { scoreThreshold, ...rulesWithoutThreshold } = rules;
    await (this.ruleConfigModel['upsert'] as (a: unknown) => Promise<unknown>)({
      where: { workspaceId },
      create: { workspaceId, rules: rulesWithoutThreshold, scoreThreshold },
      update: { rules: rulesWithoutThreshold, scoreThreshold },
    });
  }

  // ── Verification CRUD ─────────────────────────────────────────

  async createVerification(data: Record<string, unknown>): Promise<ISupplierVerification> {
    return ((await (this.verificationModel['create'] as (a: unknown) => Promise<unknown>)({ data })) as ISupplierVerification);
  }

  async findVerificationById(id: string): Promise<ISupplierVerification | null> {
    return ((await (this.verificationModel['findUnique'] as (a: unknown) => Promise<unknown>)({ where: { id } })) as ISupplierVerification | null);
  }

  async findVerificationWithChecks(id: string): Promise<IVerificationWithChecks | null> {
    const v = await (this.verificationModel['findUnique'] as (a: unknown) => Promise<unknown>)({
      where: { id },
      include: { checkResults: { orderBy: { createdAt: 'asc' } } },
    });
    return v as IVerificationWithChecks | null;
  }

  async findLatestForSupplier(supplierId: string, workspaceId: string): Promise<IVerificationWithChecks | null> {
    const v = await (this.verificationModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { supplierId, workspaceId, isLatest: true },
      include: { checkResults: { orderBy: { createdAt: 'asc' } } },
    });
    return v as IVerificationWithChecks | null;
  }

  async findAllVerifications(workspaceId: string, filter: VerificationFilterDto): Promise<[ISupplierVerification[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status && { status: filter.status }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
    };
    const [items, total] = await Promise.all([
      (this.verificationModel['findMany'] as (a: unknown) => Promise<unknown[]>)({ where, skip: filter.skip, take: filter.limit, orderBy: { createdAt: 'desc' } }),
      (this.verificationModel['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);
    return [items as ISupplierVerification[], total];
  }

  async updateVerification(id: string, data: Record<string, unknown>): Promise<ISupplierVerification> {
    return ((await (this.verificationModel['update'] as (a: unknown) => Promise<unknown>)({ where: { id }, data })) as ISupplierVerification);
  }

  async markPreviousAsNotLatest(supplierId: string, workspaceId: string): Promise<void> {
    await (this.verificationModel['updateMany'] as (a: unknown) => Promise<unknown>)({
      where: { supplierId, workspaceId, isLatest: true },
      data: { isLatest: false },
    });
  }

  async hasPendingVerification(supplierId: string, workspaceId: string): Promise<boolean> {
    const count = await (this.verificationModel['count'] as (a: unknown) => Promise<number>)({
      where: { supplierId, workspaceId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
    return count > 0;
  }

  // ── Check Results ─────────────────────────────────────────────

  async createCheckResult(data: Record<string, unknown>): Promise<IVerificationCheckResult> {
    return ((await (this.checkResultModel['create'] as (a: unknown) => Promise<unknown>)({ data })) as IVerificationCheckResult);
  }

  async updateCheckResult(id: string, data: Record<string, unknown>): Promise<IVerificationCheckResult> {
    return ((await (this.checkResultModel['update'] as (a: unknown) => Promise<unknown>)({ where: { id }, data })) as IVerificationCheckResult);
  }

  async findCheckResultsByVerification(verificationId: string): Promise<IVerificationCheckResult[]> {
    const items = await (this.checkResultModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: { verificationId },
      orderBy: { createdAt: 'asc' },
    });
    return items as IVerificationCheckResult[];
  }

  // ── Supplier Access ───────────────────────────────────────────

  async findSupplierForVerification(id: string): Promise<ISupplierForVerification | null> {
    return ((await (this.supplierModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { id, deletedAt: null },
    })) as ISupplierForVerification | null);
  }
}
