import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ProductScoringRepository } from './product-scoring.repository';
import { ProductScoringQueue } from './jobs';
import { ScoringEngine } from './engine';
import {
  CreateProductScoringDto,
  FilterProductScoringDto,
  ProductScoringResponseDto,
} from './dto';
import {
  AnalysisStatus,
  ScoreInputs,
  ScoringWeights,
} from './interfaces';

@Injectable()
export class ProductScoringService {
  private readonly logger = new Logger(ProductScoringService.name);

  constructor(
    private readonly repository: ProductScoringRepository,
    private readonly queue: ProductScoringQueue,
    private readonly engine: ScoringEngine,
    private readonly prisma: PrismaService,
  ) {}

  // ── Create ───────────────────────────────────────────────────

  async createScoring(
    workspaceId: string,
    dto: CreateProductScoringDto,
  ): Promise<ProductScoringResponseDto> {
    const version =
      dto.version ?? (await this.repository.getNextVersion(dto.opportunityId, workspaceId));

    const existing = await this.repository.findByVersion(dto.opportunityId, version, workspaceId);
    if (existing) {
      throw new BadRequestException(
        `Product score version ${version} already exists for this opportunity`,
      );
    }

    const weights = this.buildWeightsPayload(dto);

    const record = await this.repository.create({
      workspaceId,
      opportunityId: dto.opportunityId,
      version,
      status: AnalysisStatus.PENDING,
      weights,
    });

    await this.queue.addJob({
      scoringId: record['id'] as string,
      opportunityId: dto.opportunityId,
      workspaceId,
      version,
    });

    this.logger.log(`Product scoring created: ${record['id']}`);
    return this.mapToResponse(record);
  }

  // ── Execute (called by worker) ───────────────────────────────

  async executeScoring(scoringId: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findById(scoringId, workspaceId);
    if (!record) throw new NotFoundException(`Product score not found: ${scoringId}`);

    await this.repository.update(scoringId, {
      status: AnalysisStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      const inputs = await this.loadScoreInputs(
        record['opportunityId'] as string,
        workspaceId,
      );

      const weightsRaw = record['weights'] as Partial<ScoringWeights> | null;
      const result = this.engine.compute(inputs, weightsRaw ?? undefined);

      // Persist snapshot
      await this.repository.createSnapshot({
        scoreId: scoringId,
        version: record['version'] as number,
        data: result as unknown as Record<string, unknown>,
      });

      await this.repository.update(scoringId, {
        status: AnalysisStatus.COMPLETED,
        finalScore: result.finalScore,
        demandScore: result.demandScore,
        competitionScore: result.competitionScore,
        profitScore: result.profitScore,
        supplierScore: result.supplierScore,
        weights: result.weights,
        recommendation: result.recommendation,
        confidenceLevel: result.confidenceLevel,
        confidenceScore: result.confidenceScore,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        riskLevel: result.riskLevel,
        completedAt: new Date(),
      });

      // Sync final score back to Opportunity
      await this.syncOpportunityScore(
        record['opportunityId'] as string,
        result.finalScore,
        result.recommendation,
      );

      this.logger.log(`Product scoring completed: ${scoringId} → ${result.finalScore}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Product scoring failed: ${message}`);

      await this.repository.update(scoringId, {
        status: AnalysisStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });

      throw error;
    }
  }

  // ── Manual re-scoring ────────────────────────────────────────

  async triggerRescoring(
    opportunityId: string,
    workspaceId: string,
    dto?: Partial<CreateProductScoringDto>,
  ): Promise<ProductScoringResponseDto> {
    return this.createScoring(workspaceId, {
      opportunityId,
      ...dto,
    });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<ProductScoringResponseDto> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Product score not found: ${id}`);
    return this.mapToResponse(record);
  }

  async findLatestByOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<ProductScoringResponseDto | null> {
    const record = await this.repository.findLatestByOpportunity(opportunityId, workspaceId);
    return record ? this.mapToResponse(record) : null;
  }

  async findAll(
    workspaceId: string,
    filter: FilterProductScoringDto,
  ): Promise<{ data: ProductScoringResponseDto[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.repository.findAll(workspaceId, { ...filter, skip, limit });

    return { data: items.map((i) => this.mapToResponse(i)), total, page, limit };
  }

  async getStats(workspaceId: string) {
    return this.repository.getStats(workspaceId);
  }

  async findSnapshots(scoreId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    const record = await this.repository.findById(scoreId, workspaceId);
    if (!record) throw new NotFoundException(`Product score not found: ${scoreId}`);
    return this.repository.findSnapshotsByScore(scoreId);
  }

  // ── Delete ───────────────────────────────────────────────────

  async softDelete(id: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Product score not found: ${id}`);
    await this.repository.softDelete(id);
    this.logger.log(`Product score soft-deleted: ${id}`);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async loadScoreInputs(
    opportunityId: string,
    workspaceId: string,
  ): Promise<ScoreInputs> {
    const model = (this.prisma as unknown as Record<string, unknown>)[
      'opportunity'
    ] as Record<string, (a: unknown) => Promise<unknown>>;

    const record = (await model['findFirst']({
      where: { id: opportunityId, workspaceId, deletedAt: null },
      select: {
        demandScore: true,
        competitionScore: true,
        profitScore: true,
        supplierScore: true,
      },
    })) as ScoreInputs | null;

    if (!record) throw new NotFoundException(`Opportunity not found: ${opportunityId}`);
    return record;
  }

  private async syncOpportunityScore(
    opportunityId: string,
    finalScore: number,
    recommendation: string,
  ): Promise<void> {
    try {
      const model = (this.prisma as unknown as Record<string, unknown>)[
        'opportunity'
      ] as Record<string, (a: unknown) => Promise<unknown>>;

      await model['update']({
        where: { id: opportunityId },
        data: { finalScore, recommendation },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to sync final score to opportunity ${opportunityId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private buildWeightsPayload(dto: CreateProductScoringDto): Record<string, number> | null {
    if (
      dto.demandWeight == null &&
      dto.competitionWeight == null &&
      dto.profitWeight == null &&
      dto.supplierWeight == null
    ) {
      return null;
    }
    return {
      demand: dto.demandWeight ?? 0,
      competition: dto.competitionWeight ?? 0,
      profit: dto.profitWeight ?? 0,
      supplier: dto.supplierWeight ?? 0,
    };
  }

  private mapToResponse(record: Record<string, unknown>): ProductScoringResponseDto {
    return {
      id: record['id'] as string,
      workspaceId: record['workspaceId'] as string,
      opportunityId: record['opportunityId'] as string,
      version: record['version'] as number,
      status: record['status'] as AnalysisStatus,
      finalScore: record['finalScore'] as number | null,
      demandScore: record['demandScore'] as number | null,
      competitionScore: record['competitionScore'] as number | null,
      profitScore: record['profitScore'] as number | null,
      supplierScore: record['supplierScore'] as number | null,
      weights: record['weights'] as Record<string, number> | null,
      recommendation: record['recommendation'] as string | null,
      confidenceLevel: record['confidenceLevel'] as string | null,
      confidenceScore: record['confidenceScore'] as number | null,
      strengths: record['strengths'] as string[] | null,
      weaknesses: record['weaknesses'] as string[] | null,
      riskLevel: record['riskLevel'] as string | null,
      startedAt: record['startedAt'] as Date | null,
      completedAt: record['completedAt'] as Date | null,
      errorMessage: record['errorMessage'] as string | null,
      createdAt: record['createdAt'] as Date,
      updatedAt: record['updatedAt'] as Date,
      deletedAt: record['deletedAt'] as Date | null,
    };
  }
}
