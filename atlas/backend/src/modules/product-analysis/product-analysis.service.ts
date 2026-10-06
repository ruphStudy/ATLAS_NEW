import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductAnalysisRepository } from './product-analysis.repository';
import { ProductAnalysisQueue } from './jobs/product-analysis.queue';
import {
  CreateProductAnalysisDto,
  UpdateProductAnalysisDto,
  FilterProductAnalysisDto,
  ProductAnalysisResponseDto,
} from './dto';
import {
  AnalysisStatus,
  DemandAnalysisResult,
  CompetitionAnalysisResult,
  ProfitCalculationResult,
  SupplierAnalysisResult,
  AnalysisScores,
} from './interfaces';
import { ANALYSIS_CONSTANTS } from './constants';

/**
 * Product Analysis Service
 * Orchestrates all product analysis workflows.
 */
@Injectable()
export class ProductAnalysisService {
  private readonly logger = new Logger(ProductAnalysisService.name);

  constructor(
    private readonly repository: ProductAnalysisRepository,
    private readonly queue: ProductAnalysisQueue,
  ) {}

  // ── Create Analysis ─────────────────────────────────────────

  async createAnalysis(
    workspaceId: string,
    dto: CreateProductAnalysisDto,
  ): Promise<ProductAnalysisResponseDto> {
    this.logger.log(`Creating analysis for opportunity: ${dto.opportunityId}`);

    // Determine version
    const version = dto.version || 
      (await this.repository.getNextVersion(dto.opportunityId, workspaceId));

    // Check if version already exists
    const existing = await this.repository.findByVersion(
      dto.opportunityId,
      version,
      workspaceId,
    );

    if (existing) {
      throw new BadRequestException(
        `Analysis version ${version} already exists for this opportunity`,
      );
    }

    // Create analysis record
    const analysis = await this.repository.createAnalysis({
      workspaceId,
      opportunityId: dto.opportunityId,
      version,
      status: AnalysisStatus.PENDING,
    });

    // Queue analysis job
    await this.queue.addAnalysisJob({
      analysisId: analysis.id,
      opportunityId: dto.opportunityId,
      workspaceId,
      version,
    });

    this.logger.log(`Analysis created: ${analysis.id}`);
    return this.mapToResponse(analysis);
  }

  // ── Execute Analysis ────────────────────────────────────────

  async executeAnalysis(analysisId: string, workspaceId: string): Promise<void> {
    this.logger.log(`Executing analysis: ${analysisId}`);

    const analysis = await this.repository.findAnalysisById(analysisId, workspaceId);
    if (!analysis) {
      throw new NotFoundException(`Analysis not found: ${analysisId}`);
    }

    try {
      // Mark as running
      await this.repository.updateAnalysis(analysisId, workspaceId, {
        status: AnalysisStatus.RUNNING,
        startedAt: new Date(),
      });

      // Execute all analysis workflows
      const [demand, competition, profit, supplier] = await Promise.all([
        this.executeDemandAnalysis(analysis.opportunityId, workspaceId),
        this.executeCompetitionAnalysis(analysis.opportunityId, workspaceId),
        this.executeProfitCalculation(analysis.opportunityId, workspaceId),
        this.executeSupplierAnalysis(analysis.opportunityId, workspaceId),
      ]);

      // Calculate final score
      const scores = this.calculateFinalScore(demand, competition, profit, supplier);

      // Update analysis with results
      await this.repository.updateAnalysis(analysisId, workspaceId, {
        status: AnalysisStatus.COMPLETED,
        demandAnalysis: demand,
        competitionAnalysis: competition,
        profitCalculation: profit,
        supplierAnalysis: supplier,
        demandScore: scores.demandScore,
        competitionScore: scores.competitionScore,
        profitScore: scores.profitScore,
        supplierScore: scores.supplierScore,
        finalScore: scores.finalScore,
        completedAt: new Date(),
      });

      this.logger.log(`Analysis completed: ${analysisId}`);
    } catch (error) {
      this.logger.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      await this.repository.updateAnalysis(analysisId, workspaceId, {
        status: AnalysisStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });

      throw error;
    }
  }

  // ── Analysis Workflows ──────────────────────────────────────

  private async executeDemandAnalysis(
    opportunityId: string,
    workspaceId: string,
  ): Promise<DemandAnalysisResult> {
    this.logger.log(`Executing demand analysis for opportunity: ${opportunityId}`);

    // TODO: Implement actual demand analysis logic
    // This is a placeholder that simulates the analysis
    return {
      searchVolume: Math.floor(Math.random() * 10000),
      trend: 'increasing',
      seasonality: 'moderate',
      score: Math.floor(Math.random() * 40) + 60, // 60-100
    };
  }

  private async executeCompetitionAnalysis(
    opportunityId: string,
    workspaceId: string,
  ): Promise<CompetitionAnalysisResult> {
    this.logger.log(`Executing competition analysis for opportunity: ${opportunityId}`);

    // TODO: Implement actual competition analysis logic
    // This is a placeholder that simulates the analysis
    return {
      competitorCount: Math.floor(Math.random() * 50),
      averagePrice: Math.random() * 100,
      marketSaturation: 'medium',
      score: Math.floor(Math.random() * 40) + 50, // 50-90
    };
  }

  private async executeProfitCalculation(
    opportunityId: string,
    workspaceId: string,
  ): Promise<ProfitCalculationResult> {
    this.logger.log(`Executing profit calculation for opportunity: ${opportunityId}`);

    // TODO: Implement actual profit calculation logic
    // This is a placeholder that simulates the calculation
    const cost = Math.random() * 50;
    const price = cost * (1 + Math.random() * 2);
    const margin = ((price - cost) / price) * 100;

    return {
      estimatedCost: cost,
      estimatedPrice: price,
      estimatedMargin: margin,
      score: Math.min(100, margin * 1.5), // Convert margin to score
    };
  }

  private async executeSupplierAnalysis(
    opportunityId: string,
    workspaceId: string,
  ): Promise<SupplierAnalysisResult> {
    this.logger.log(`Executing supplier analysis for opportunity: ${opportunityId}`);

    // TODO: Implement actual supplier analysis logic
    // This is a placeholder that simulates the analysis
    return {
      availableSuppliers: Math.floor(Math.random() * 20),
      averageRating: Math.random() * 2 + 3, // 3-5
      verifiedCount: Math.floor(Math.random() * 10),
      score: Math.floor(Math.random() * 30) + 60, // 60-90
    };
  }

  private calculateFinalScore(
    demand: DemandAnalysisResult,
    competition: CompetitionAnalysisResult,
    profit: ProfitCalculationResult,
    supplier: SupplierAnalysisResult,
  ): AnalysisScores {
    const weights = ANALYSIS_CONSTANTS.SCORE_WEIGHTS;

    const finalScore =
      demand.score * weights.DEMAND +
      competition.score * weights.COMPETITION +
      profit.score * weights.PROFIT +
      supplier.score * weights.SUPPLIER;

    return {
      demandScore: Math.round(demand.score * 10) / 10,
      competitionScore: Math.round(competition.score * 10) / 10,
      profitScore: Math.round(profit.score * 10) / 10,
      supplierScore: Math.round(supplier.score * 10) / 10,
      finalScore: Math.round(finalScore * 10) / 10,
    };
  }

  // ── Read ────────────────────────────────────────────────────

  async findAnalysisById(
    id: string,
    workspaceId: string,
  ): Promise<ProductAnalysisResponseDto> {
    const analysis = await this.repository.findAnalysisById(id, workspaceId);
    if (!analysis) {
      throw new NotFoundException(`Analysis not found: ${id}`);
    }
    return this.mapToResponse(analysis);
  }

  async findLatestByOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<ProductAnalysisResponseDto | null> {
    const analysis = await this.repository.findLatestByOpportunity(
      opportunityId,
      workspaceId,
    );
    return analysis ? this.mapToResponse(analysis) : null;
  }

  async findAllAnalyses(
    workspaceId: string,
    filter: FilterProductAnalysisDto,
  ): Promise<{ data: ProductAnalysisResponseDto[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.repository.findAllAnalyses(workspaceId, {
      ...filter,
      skip,
      limit,
    });

    return {
      data: items.map((item) => this.mapToResponse(item)),
      total,
      page,
      limit,
    };
  }

  async getAnalysisStats(workspaceId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    return this.repository.getAnalysisStats(workspaceId);
  }

  // ── Update ──────────────────────────────────────────────────

  async updateAnalysis(
    id: string,
    workspaceId: string,
    dto: UpdateProductAnalysisDto,
  ): Promise<ProductAnalysisResponseDto> {
    const analysis = await this.repository.findAnalysisById(id, workspaceId);
    if (!analysis) {
      throw new NotFoundException(`Analysis not found: ${id}`);
    }

    const updated = await this.repository.updateAnalysis(
      id,
      workspaceId,
      dto as unknown as Record<string, unknown>,
    );
    return this.mapToResponse(updated);
  }

  // ── Delete ──────────────────────────────────────────────────

  async deleteAnalysis(id: string, workspaceId: string): Promise<void> {
    const analysis = await this.repository.findAnalysisById(id, workspaceId);
    if (!analysis) {
      throw new NotFoundException(`Analysis not found: ${id}`);
    }

    await this.repository.softDeleteAnalysis(id, workspaceId);
    this.logger.log(`Analysis soft deleted: ${id}`);
  }

  // ── Re-analysis ─────────────────────────────────────────────

  async triggerReanalysis(
    opportunityId: string,
    workspaceId: string,
  ): Promise<ProductAnalysisResponseDto> {
    this.logger.log(`Triggering re-analysis for opportunity: ${opportunityId}`);

    const nextVersion = await this.repository.getNextVersion(opportunityId, workspaceId);

    return this.createAnalysis(workspaceId, {
      opportunityId,
      version: nextVersion,
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private mapToResponse(analysis: {
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
  }): ProductAnalysisResponseDto {
    return {
      id: analysis.id,
      workspaceId: analysis.workspaceId,
      opportunityId: analysis.opportunityId,
      version: analysis.version,
      status: analysis.status,
      demandAnalysis: analysis.demandAnalysis as Record<string, unknown> | undefined,
      competitionAnalysis: analysis.competitionAnalysis as Record<string, unknown> | undefined,
      profitCalculation: analysis.profitCalculation as Record<string, unknown> | undefined,
      supplierAnalysis: analysis.supplierAnalysis as Record<string, unknown> | undefined,
      demandScore: analysis.demandScore,
      competitionScore: analysis.competitionScore,
      profitScore: analysis.profitScore,
      supplierScore: analysis.supplierScore,
      finalScore: analysis.finalScore,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      errorMessage: analysis.errorMessage,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
      deletedAt: analysis.deletedAt,
    };
  }
}
