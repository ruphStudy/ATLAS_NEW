import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { AnalysisStatus } from './interfaces';

@Injectable()
export class ProductScoringRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'productScore'
    ] as Record<string, unknown>;
  }

  private get snapshotModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'productScoreSnapshot'
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

  async findLatestByOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { opportunityId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findByVersion(
    opportunityId: string,
    version: number,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { opportunityId, version, workspaceId, deletedAt: null },
    });
  }

  async findAll(
    workspaceId: string,
    filter: {
      opportunityId?: string;
      status?: AnalysisStatus;
      recommendation?: string;
      riskLevel?: string;
      version?: number;
      skip?: number;
      limit?: number;
    },
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.opportunityId && { opportunityId: filter.opportunityId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.recommendation && { recommendation: filter.recommendation }),
      ...(filter.riskLevel && { riskLevel: filter.riskLevel }),
      ...(filter.version !== undefined && { version: filter.version }),
    };

    const [items, total] = await Promise.all([
      (this.model['findMany'] as (a: unknown) => Promise<unknown[]>)({
        where,
        skip: filter.skip ?? 0,
        take: filter.limit ?? 20,
        orderBy: [{ opportunityId: 'desc' }, { version: 'desc' }],
      }),
      (this.model['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);

    return [items as Record<string, unknown>[], total];
  }

  async getNextVersion(opportunityId: string, workspaceId: string): Promise<number> {
    const latest = await this.findLatestByOpportunity(opportunityId, workspaceId);
    return latest ? (latest['version'] as number) + 1 : 1;
  }

  // ── Update ───────────────────────────────────────────────────

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Soft delete ──────────────────────────────────────────────

  async softDelete(id: string): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Snapshots ────────────────────────────────────────────────

  async createSnapshot(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return (
      this.snapshotModel['create'] as (a: unknown) => Promise<Record<string, unknown>>
    )({ data });
  }

  async findSnapshotsByScore(scoreId: string): Promise<Record<string, unknown>[]> {
    return (this.snapshotModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: { scoreId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Record<string, unknown>[]>;
  }

  // ── Statistics ───────────────────────────────────────────────

  async getStats(workspaceId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const count = (status?: string) =>
      (this.model['count'] as (a: unknown) => Promise<number>)({
        where: { workspaceId, deletedAt: null, ...(status ? { status } : {}) },
      });

    const [total, pending, running, completed, failed] = await Promise.all([
      count(),
      count('PENDING'),
      count('RUNNING'),
      count('COMPLETED'),
      count('FAILED'),
    ]);

    return { total, pending, running, completed, failed };
  }
}
