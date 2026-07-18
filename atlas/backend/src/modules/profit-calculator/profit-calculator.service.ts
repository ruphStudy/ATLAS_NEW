import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ProfitCalculatorRepository } from './profit-calculator.repository';
import { ProfitCalculatorQueue } from './jobs';
import { AmazonFbaProvider, AmazonFbmProvider } from './providers';
import {
  CreateProfitCalculationDto,
  FilterProfitCalculationDto,
  ProfitCalculationResponseDto,
} from './dto';
import {
  AnalysisStatus,
  ProfitProvider,
  IProfitProvider,
  ProfitProviderOptions,
} from './interfaces';

@Injectable()
export class ProfitCalculatorService {
  private readonly logger = new Logger(ProfitCalculatorService.name);
  private readonly providers = new Map<ProfitProvider, IProfitProvider>();

  constructor(
    private readonly repository: ProfitCalculatorRepository,
    private readonly queue: ProfitCalculatorQueue,
    private readonly prisma: PrismaService,
    fbaProvider: AmazonFbaProvider,
    fbmProvider: AmazonFbmProvider,
  ) {
    this.registerProvider(fbaProvider);
    this.registerProvider(fbmProvider);
  }

  // ── Provider registry ────────────────────────────────────────

  private registerProvider(provider: IProfitProvider): void {
    this.providers.set(provider.providerName, provider);
    this.logger.log(`Registered profit provider: ${provider.providerName}`);
  }

  private resolveProvider(name: ProfitProvider): IProfitProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new BadRequestException(`Provider not supported: ${name}`);
    if (!provider.isAvailable()) throw new BadRequestException(`Provider not available: ${name}`);
    return provider;
  }

  // ── Create ───────────────────────────────────────────────────

  async createCalculation(
    workspaceId: string,
    dto: CreateProfitCalculationDto,
  ): Promise<ProfitCalculationResponseDto> {
    const provider = dto.provider ?? ProfitProvider.AMAZON_FBA;
    const version =
      dto.version ?? (await this.repository.getNextVersion(dto.opportunityId, workspaceId));

    const existing = await this.repository.findByVersion(dto.opportunityId, version, workspaceId);
    if (existing) {
      throw new BadRequestException(
        `Profit calculation version ${version} already exists for this opportunity`,
      );
    }

    const record = await this.repository.create({
      workspaceId,
      opportunityId: dto.opportunityId,
      version,
      provider,
      status: AnalysisStatus.PENDING,
      ...(dto.productCost !== undefined && { productCostOverride: dto.productCost }),
      ...(dto.shippingCost !== undefined && { shippingCostOverride: dto.shippingCost }),
      ...(dto.packagingCost !== undefined && { packagingCostOverride: dto.packagingCost }),
      ...(dto.advertisingCost !== undefined && { advertisingCostOverride: dto.advertisingCost }),
      ...(dto.taxRate !== undefined && { taxRateOverride: dto.taxRate }),
      ...(dto.sellingPrice !== undefined && { sellingPriceOverride: dto.sellingPrice }),
    });

    await this.queue.addJob({
      calculationId: record['id'] as string,
      opportunityId: dto.opportunityId,
      workspaceId,
      version,
      provider,
    });

    this.logger.log(`Profit calculation created: ${record['id']}`);
    return this.mapToResponse(record);
  }

  // ── Execute (called by worker) ───────────────────────────────

  async executeCalculation(calculationId: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findById(calculationId, workspaceId);
    if (!record) throw new NotFoundException(`Profit calculation not found: ${calculationId}`);

    await this.repository.update(calculationId, {
      status: AnalysisStatus.RUNNING,
      startedAt: new Date(),
    });

    try {
      const opportunity = await this.loadOpportunity(
        record['opportunityId'] as string,
        workspaceId,
      );

      const providerName = record['provider'] as ProfitProvider;
      const provider = this.resolveProvider(providerName);

      const options: ProfitProviderOptions = {
        keyword: opportunity.keyword,
        marketplace: opportunity.marketplace,
        country: opportunity.country,
        category: opportunity.category,
        productCost: record['productCostOverride'] as number | undefined,
        shippingCost: record['shippingCostOverride'] as number | undefined,
        packagingCost: record['packagingCostOverride'] as number | undefined,
        advertisingCost: record['advertisingCostOverride'] as number | undefined,
        taxRate: record['taxRateOverride'] as number | undefined,
        sellingPrice: record['sellingPriceOverride'] as number | undefined,
      };

      const result = await provider.calculate(options);

      // Persist snapshot
      await this.repository.createSnapshot({
        calculationId,
        version: record['version'] as number,
        data: result as unknown as Record<string, unknown>,
      });

      await this.repository.update(calculationId, {
        status: AnalysisStatus.COMPLETED,
        productCost: result.costs.productCost,
        shippingCost: result.costs.shippingCost,
        packagingCost: result.costs.packagingCost,
        advertisingCost: result.costs.advertisingCost,
        tax: result.costs.tax,
        marketplaceFees: result.costs.marketplaceFees,
        fbaFees: result.costs.fbaFees,
        totalLandedCost: result.costs.totalLandedCost,
        sellingPrice: result.profit.sellingPrice,
        grossProfit: result.profit.grossProfit,
        netProfit: result.profit.netProfit,
        profitMargin: result.profit.profitMargin,
        roi: result.profit.roi,
        breakEvenPrice: result.profit.breakEvenPrice,
        profitScore: result.profitScore,
        rawData: result.rawData,
        completedAt: new Date(),
      });

      // Sync profit score to Opportunity
      await this.syncOpportunityScore(record['opportunityId'] as string, result.profitScore);

      this.logger.log(`Profit calculation completed: ${calculationId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Profit calculation failed: ${message}`);

      await this.repository.update(calculationId, {
        status: AnalysisStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });

      throw error;
    }
  }

  // ── Manual recalculation ─────────────────────────────────────

  async triggerRecalculation(
    opportunityId: string,
    workspaceId: string,
    provider?: ProfitProvider,
  ): Promise<ProfitCalculationResponseDto> {
    return this.createCalculation(workspaceId, {
      opportunityId,
      provider: provider ?? ProfitProvider.AMAZON_FBA,
    });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<ProfitCalculationResponseDto> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Profit calculation not found: ${id}`);
    return this.mapToResponse(record);
  }

  async findLatestByOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<ProfitCalculationResponseDto | null> {
    const record = await this.repository.findLatestByOpportunity(opportunityId, workspaceId);
    return record ? this.mapToResponse(record) : null;
  }

  async findAll(
    workspaceId: string,
    filter: FilterProfitCalculationDto,
  ): Promise<{ data: ProfitCalculationResponseDto[]; total: number; page: number; limit: number }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.repository.findAll(workspaceId, { ...filter, skip, limit });

    return { data: items.map((i) => this.mapToResponse(i)), total, page, limit };
  }

  async getStats(workspaceId: string) {
    return this.repository.getStats(workspaceId);
  }

  async findSnapshots(
    calculationId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    const record = await this.repository.findById(calculationId, workspaceId);
    if (!record) throw new NotFoundException(`Profit calculation not found: ${calculationId}`);
    return this.repository.findSnapshotsByCalculation(calculationId);
  }

  // ── Delete ───────────────────────────────────────────────────

  async softDelete(id: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Profit calculation not found: ${id}`);
    await this.repository.softDelete(id);
    this.logger.log(`Profit calculation soft-deleted: ${id}`);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async loadOpportunity(
    opportunityId: string,
    workspaceId: string,
  ): Promise<{ keyword: string; marketplace: string; country: string; category: string | null }> {
    const model = (this.prisma as unknown as Record<string, unknown>)[
      'opportunity'
    ] as Record<string, (a: unknown) => Promise<unknown>>;

    const record = (await model['findFirst']({
      where: { id: opportunityId, workspaceId, deletedAt: null },
      select: { keyword: true, marketplace: true, country: true, category: true },
    })) as { keyword: string; marketplace: string; country: string; category: string | null } | null;

    if (!record) throw new NotFoundException(`Opportunity not found: ${opportunityId}`);
    return record;
  }

  private async syncOpportunityScore(opportunityId: string, score: number): Promise<void> {
    try {
      const model = (this.prisma as unknown as Record<string, unknown>)[
        'opportunity'
      ] as Record<string, (a: unknown) => Promise<unknown>>;

      await model['update']({
        where: { id: opportunityId },
        data: { profitScore: score },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to sync profit score to opportunity ${opportunityId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private mapToResponse(record: Record<string, unknown>): ProfitCalculationResponseDto {
    return {
      id: record['id'] as string,
      workspaceId: record['workspaceId'] as string,
      opportunityId: record['opportunityId'] as string,
      version: record['version'] as number,
      provider: record['provider'] as string,
      status: record['status'] as AnalysisStatus,
      productCost: record['productCost'] as number | null,
      shippingCost: record['shippingCost'] as number | null,
      packagingCost: record['packagingCost'] as number | null,
      advertisingCost: record['advertisingCost'] as number | null,
      tax: record['tax'] as number | null,
      marketplaceFees: record['marketplaceFees'] as number | null,
      fbaFees: record['fbaFees'] as number | null,
      totalLandedCost: record['totalLandedCost'] as number | null,
      sellingPrice: record['sellingPrice'] as number | null,
      grossProfit: record['grossProfit'] as number | null,
      netProfit: record['netProfit'] as number | null,
      profitMargin: record['profitMargin'] as number | null,
      roi: record['roi'] as number | null,
      breakEvenPrice: record['breakEvenPrice'] as number | null,
      profitScore: record['profitScore'] as number | null,
      startedAt: record['startedAt'] as Date | null,
      completedAt: record['completedAt'] as Date | null,
      errorMessage: record['errorMessage'] as string | null,
      createdAt: record['createdAt'] as Date,
      updatedAt: record['updatedAt'] as Date,
      deletedAt: record['deletedAt'] as Date | null,
    };
  }
}
