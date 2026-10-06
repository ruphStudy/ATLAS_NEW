import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { CompetitionAnalysisRepository } from './competition-analysis.repository';
import { CompetitionAnalysisQueue } from './jobs';
import { AmazonSearchProvider } from './providers';
import {
  CreateCompetitionAnalysisDto,
  FilterCompetitionAnalysisDto,
  CompetitionAnalysisResponseDto,
} from './dto';
import {
  AnalysisStatus,
  CompetitionProvider,
  ICompetitionProvider,
  CompetitionProviderOptions,
} from './interfaces';

@Injectable()
export class CompetitionAnalysisService {
  private readonly logger = new Logger(CompetitionAnalysisService.name);
  private readonly providers = new Map<CompetitionProvider, ICompetitionProvider>();

  constructor(
    private readonly repository: CompetitionAnalysisRepository,
    private readonly queue: CompetitionAnalysisQueue,
    private readonly prisma: PrismaService,
    amazonSearchProvider: AmazonSearchProvider,
  ) {
    this.registerProvider(amazonSearchProvider);
  }

  // ── Provider registry ────────────────────────────────────────

  private registerProvider(provider: ICompetitionProvider): void {
    this.providers.set(provider.providerName, provider);
    this.logger.log(`Registered competition provider: ${provider.providerName}`);
  }

  private resolveProvider(providerName: CompetitionProvider): ICompetitionProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(`Provider not supported: ${providerName}`);
    }
    if (!provider.isAvailable()) {
      throw new BadRequestException(`Provider not available: ${providerName}`);
    }
    return provider;
  }

  // ── Create ───────────────────────────────────────────────────

  async createAnalysis(
    workspaceId: string,
    dto: CreateCompetitionAnalysisDto,
  ): Promise<CompetitionAnalysisResponseDto> {
    const provider = dto.provider ?? CompetitionProvider.AMAZON_SEARCH;
    const version =
      dto.version ??
      (await this.repository.getNextVersion(dto.opportunityId, workspaceId));

    const existing = await this.repository.findByVersion(
      dto.opportunityId,
      version,
      workspaceId,
    );
    if (existing) {
      throw new BadRequestException(
        `Competition analysis version ${version} already exists for this opportunity`,
      );
    }

    const record = await this.repository.createAnalysis({
      workspaceId,
      opportunityId: dto.opportunityId,
      version,
      provider,
      status: AnalysisStatus.PENDING,
    });

    await this.queue.addJob({
      analysisId: record['id'] as string,
      opportunityId: dto.opportunityId,
      workspaceId,
      version,
      provider,
    });

    this.logger.log(`Competition analysis created: ${record['id']}`);
    return this.mapToResponse(record);
  }

  // ── Execute (called by worker) ───────────────────────────────

  async executeAnalysis(analysisId: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findById(analysisId, workspaceId);
    if (!record) {
      throw new NotFoundException(`Competition analysis not found: ${analysisId}`);
    }

    await this.repository.updateAnalysis(analysisId, {
      status: AnalysisStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      const opportunity = await this.loadOpportunity(
        record['opportunityId'] as string,
        workspaceId,
      );

      const providerName = record['provider'] as CompetitionProvider;
      const provider = this.resolveProvider(providerName);

      const options: CompetitionProviderOptions = {
        keyword: opportunity.keyword,
        marketplace: opportunity.marketplace,
        country: opportunity.country,
      };

      const result = await provider.analyze(options);

      // Persist snapshot before writing results
      await this.repository.createSnapshot({
        analysisId,
        version: record['version'] as number,
        data: result as unknown as Record<string, unknown>,
      });

      await this.repository.updateAnalysis(analysisId, {
        status: AnalysisStatus.COMPLETED,
        competitorCount: result.competitorCount,
        averagePrice: result.averagePrice,
        minPrice: result.minPrice,
        maxPrice: result.maxPrice,
        priceRange: result.priceRange,
        ratingDistribution: result.ratingDistribution,
        reviewDistribution: result.reviewDistribution,
        brandDominance: result.brandDominance,
        sellerTypeBreakdown: result.sellerTypeBreakdown,
        listingQuality: result.listingQuality,
        keywordCompetition: result.keywordCompetition,
        competitionScore: result.competitionScore,
        rawData: result.rawData,
        completedAt: new Date(),
      });

      // Back-fill competition score on the Opportunity record
      await this.syncOpportunityScore(
        record['opportunityId'] as string,
        result.competitionScore,
      );

      this.logger.log(`Competition analysis completed: ${analysisId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Competition analysis failed: ${message}`);

      await this.repository.updateAnalysis(analysisId, {
        status: AnalysisStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });

      throw error;
    }
  }

  // ── Manual re-analysis ───────────────────────────────────────

  async triggerReanalysis(
    opportunityId: string,
    workspaceId: string,
    provider?: CompetitionProvider,
  ): Promise<CompetitionAnalysisResponseDto> {
    return this.createAnalysis(workspaceId, {
      opportunityId,
      provider: provider ?? CompetitionProvider.AMAZON_SEARCH,
    });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<CompetitionAnalysisResponseDto> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) {
      throw new NotFoundException(`Competition analysis not found: ${id}`);
    }
    return this.mapToResponse(record);
  }

  async findLatestByOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<CompetitionAnalysisResponseDto | null> {
    const record = await this.repository.findLatestByOpportunity(
      opportunityId,
      workspaceId,
    );
    return record ? this.mapToResponse(record) : null;
  }

  async findAll(
    workspaceId: string,
    filter: FilterCompetitionAnalysisDto,
  ): Promise<{
    data: CompetitionAnalysisResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.repository.findAll(workspaceId, {
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

  async getStats(workspaceId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    return this.repository.getStats(workspaceId);
  }

  async findSnapshots(
    analysisId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    const record = await this.repository.findById(analysisId, workspaceId);
    if (!record) {
      throw new NotFoundException(`Competition analysis not found: ${analysisId}`);
    }
    return this.repository.findSnapshotsByAnalysis(analysisId);
  }

  // ── Delete ───────────────────────────────────────────────────

  async softDelete(id: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) {
      throw new NotFoundException(`Competition analysis not found: ${id}`);
    }
    await this.repository.softDelete(id);
    this.logger.log(`Competition analysis soft-deleted: ${id}`);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async loadOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<{ keyword: string; marketplace: string; country: string }> {
    const opportunity = await (
      this.prisma as unknown as Record<string, unknown>
    )['opportunity'] as Record<string, (a: unknown) => Promise<unknown>>;

    const record = (await opportunity['findFirst']({
      where: { id: opportunityId, workspaceId, deletedAt: null },
      select: { keyword: true, marketplace: true, country: true },
    })) as { keyword: string; marketplace: string; country: string } | null;

    if (!record) {
      throw new NotFoundException(`Opportunity not found: ${opportunityId}`);
    }

    return record;
  }

  private async syncOpportunityScore(
    opportunityId: string,
    score: number,
  ): Promise<void> {
    try {
      const model = (this.prisma as unknown as Record<string, unknown>)[
        'opportunity'
      ] as Record<string, (a: unknown) => Promise<unknown>>;

      await model['update']({
        where: { id: opportunityId },
        data: { competitionScore: score },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to sync competition score to opportunity ${opportunityId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapToResponse(record: Record<string, unknown>): CompetitionAnalysisResponseDto {
    return {
      id: record['id'] as string,
      workspaceId: record['workspaceId'] as string,
      opportunityId: record['opportunityId'] as string,
      version: record['version'] as number,
      provider: record['provider'] as string,
      status: record['status'] as AnalysisStatus,
      competitorCount: record['competitorCount'] as number | null,
      averagePrice: record['averagePrice'] as number | null,
      minPrice: record['minPrice'] as number | null,
      maxPrice: record['maxPrice'] as number | null,
      priceRange: record['priceRange'] as number | null,
      ratingDistribution: record['ratingDistribution'] as Record<string, unknown> | null,
      reviewDistribution: record['reviewDistribution'] as Record<string, unknown> | null,
      brandDominance: record['brandDominance'] as Record<string, unknown> | null,
      sellerTypeBreakdown: record['sellerTypeBreakdown'] as Record<string, unknown> | null,
      listingQuality: record['listingQuality'] as Record<string, unknown> | null,
      keywordCompetition: record['keywordCompetition'] as Record<string, unknown> | null,
      competitionScore: record['competitionScore'] as number | null,
      startedAt: record['startedAt'] as Date | null,
      completedAt: record['completedAt'] as Date | null,
      errorMessage: record['errorMessage'] as string | null,
      createdAt: record['createdAt'] as Date,
      updatedAt: record['updatedAt'] as Date,
      deletedAt: record['deletedAt'] as Date | null,
    };
  }
}
