import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { AnalysisStatus } from './interfaces';

interface IProductAnalysis {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  status: AnalysisStatus;
  demandAnalysis?: unknown;
  competitionAnalysis?: unknown;
  profitCalculation?: unknown;
  supplierAnalysis?: unknown;
  demandScore?: number;
  competitionScore?: number;
  profitScore?: number;
  supplierScore?: number;
  finalScore?: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

@Injectable()
export class ProductAnalysisRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessor ──────────────────────────────────────────
  private get analysisModel() {
    return (this.prisma as unknown as Record<string, unknown>)['productAnalysis'] as Record<string, unknown>;
  }

  // ── Create ──────────────────────────────────────────────────

  async createAnalysis(data: Record<string, unknown>): Promise<IProductAnalysis> {
    return ((await (this.analysisModel['create'] as (a: unknown) => Promise<unknown>)({ data })) as IProductAnalysis);
  }

  // ── Read ────────────────────────────────────────────────────

  async findAnalysisById(id: string, workspaceId: string): Promise<IProductAnalysis | null> {
    return ((await (this.analysisModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { id, workspaceId, deletedAt: null },
    })) as IProductAnalysis | null);
  }

  async findLatestByOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<IProductAnalysis | null> {
    return ((await (this.analysisModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { opportunityId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    })) as IProductAnalysis | null);
  }

  async findByVersion(
    opportunityId: string,
    version: number,
    workspaceId: string,
  ): Promise<IProductAnalysis | null> {
    return ((await (this.analysisModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { opportunityId, version, workspaceId, deletedAt: null },
    })) as IProductAnalysis | null);
  }

  async findAllAnalyses(
    workspaceId: string,
    filter: {
      opportunityId?: string;
      status?: AnalysisStatus;
      version?: number;
      skip?: number;
      limit?: number;
    },
  ): Promise<[IProductAnalysis[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.opportunityId && { opportunityId: filter.opportunityId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.version && { version: filter.version }),
    };

    const [items, total] = await Promise.all([
      (this.analysisModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
        where,
        skip: filter.skip || 0,
        take: filter.limit || 20,
        orderBy: [{ opportunityId: 'desc' }, { version: 'desc' }],
      }),
      (this.analysisModel['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);

    return [items as IProductAnalysis[], total];
  }

  async getNextVersion(opportunityId: string, workspaceId: string): Promise<number> {
    const latest = await this.findLatestByOpportunity(opportunityId, workspaceId);
    return latest ? latest.version + 1 : 1;
  }

  // ── Update ──────────────────────────────────────────────────

  async updateAnalysis(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<IProductAnalysis> {
    return ((await (this.analysisModel['update'] as (a: unknown) => Promise<unknown>)({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    })) as IProductAnalysis);
  }

  // ── Delete (Soft) ───────────────────────────────────────────

  async softDeleteAnalysis(id: string, workspaceId: string): Promise<IProductAnalysis> {
    return ((await (this.analysisModel['update'] as (a: unknown) => Promise<unknown>)({
      where: { id },
      data: { deletedAt: new Date() },
    })) as IProductAnalysis);
  }

  // ── Statistics ──────────────────────────────────────────────

  async getAnalysisStats(workspaceId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const [total, pending, running, completed, failed] = await Promise.all([
      (this.analysisModel['count'] as (a: unknown) => Promise<number>)({
        where: { workspaceId, deletedAt: null },
      }),
      (this.analysisModel['count'] as (a: unknown) => Promise<number>)({
        where: { workspaceId, status: 'PENDING', deletedAt: null },
      }),
      (this.analysisModel['count'] as (a: unknown) => Promise<number>)({
        where: { workspaceId, status: 'RUNNING', deletedAt: null },
      }),
      (this.analysisModel['count'] as (a: unknown) => Promise<number>)({
        where: { workspaceId, status: 'COMPLETED', deletedAt: null },
      }),
      (this.analysisModel['count'] as (a: unknown) => Promise<number>)({
        where: { workspaceId, status: 'FAILED', deletedAt: null },
      }),
    ]);

    return { total, pending, running, completed, failed };
  }
}
