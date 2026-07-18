import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PricingRepository } from './pricing.repository';
import { PricingCalculationEngine } from './engines/pricing-calculation.engine';
import { PricingStrategyEngine } from './engines/pricing-strategy.engine';
import { PricingValidationEngine } from './engines/pricing-validation.engine';
import { PricingCalculationQueue, PricingEventQueue } from './jobs';
import {
  PricingEvent,
  PricingInput,
  PricingStatus,
  PricingStrategy,
  BulkPricingInput,
  BulkPricingResult,
  PricingSimulationInput,
  PricingComparisonRow,
} from './interfaces';
import {
  CalculatePricingDto,
  PricingRecordFilterDto,
  PricingConfigFilterDto,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  BulkCalculatePricingDto,
  SimulatePricingDto,
  ApprovePricingDto,
  PricingCalculationResponseDto,
  PricingConfigResponseDto,
  PricingListResponseDto,
  PricingRecordResponseDto,
} from './dto';
import { PRICING_CONSTANTS } from './constants';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly repository: PricingRepository,
    private readonly calculationEngine: PricingCalculationEngine,
    private readonly strategyEngine: PricingStrategyEngine,
    private readonly validationEngine: PricingValidationEngine,
    private readonly calculationQueue: PricingCalculationQueue,
    private readonly eventQueue: PricingEventQueue,
  ) {}

  // ── Config CRUD ──────────────────────────────────────────────

  async createConfig(
    workspaceId: string,
    dto: CreatePricingConfigDto,
    createdBy: string,
  ): Promise<PricingConfigResponseDto> {
    const record = await this.repository.createConfig({
      workspaceId,
      marketplaceKey: dto.marketplaceKey,
      country: dto.country ?? PRICING_CONSTANTS.DEFAULT_COUNTRY,
      currency: dto.currency ?? PRICING_CONSTANTS.DEFAULT_CURRENCY,
      strategy: dto.strategy ?? PRICING_CONSTANTS.DEFAULT_STRATEGY,
      isDefault: dto.isDefault ?? false,
      isActive: true,
      commissionPct: dto.commissionPct ?? null,
      fulfilmentFeeFlat: dto.fulfilmentFeeFlat ?? null,
      shippingFeeFlat: dto.shippingFeeFlat ?? null,
      paymentProcessingPct: dto.paymentProcessingPct ?? null,
      packagingCostFlat: dto.packagingCostFlat ?? null,
      advertisingCostPct: dto.advertisingCostPct ?? null,
      taxPct: dto.taxPct ?? null,
      targetMarginPct: dto.targetMarginPct ?? null,
      targetRoi: dto.targetRoi ?? null,
      minProfitFlat: dto.minProfitFlat ?? null,
      minMarginPct: dto.minMarginPct ?? null,
      marketplacePriceAdjustmentPct: dto.marketplacePriceAdjustmentPct ?? null,
      regionalPriceAdjustmentPct: dto.regionalPriceAdjustmentPct ?? null,
      currencyConversionRate: dto.currencyConversionRate ?? null,
      rules: dto.rules ?? null,
      createdBy,
      updatedBy: createdBy,
    });
    return PricingConfigResponseDto.from(record);
  }

  async findAllConfigs(
    workspaceId: string,
    filter: PricingConfigFilterDto,
  ): Promise<{ data: PricingConfigResponseDto[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.repository.findAllConfigs(workspaceId, filter);
    return {
      data: items.map(PricingConfigResponseDto.from),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findConfigById(id: string, workspaceId: string): Promise<PricingConfigResponseDto> {
    const record = await this.repository.findConfigById(id, workspaceId);
    if (!record) throw new NotFoundException(`Pricing config ${id} not found`);
    return PricingConfigResponseDto.from(record);
  }

  async updateConfig(
    id: string,
    workspaceId: string,
    dto: UpdatePricingConfigDto,
    updatedBy: string,
  ): Promise<PricingConfigResponseDto> {
    await this.findConfigOrFail(id, workspaceId);
    const updated = await this.repository.updateConfig(id, workspaceId, {
      ...this.flattenConfigDto(dto),
      updatedBy,
    });
    return PricingConfigResponseDto.from(updated);
  }

  async deleteConfig(id: string, workspaceId: string): Promise<void> {
    await this.findConfigOrFail(id, workspaceId);
    await this.repository.softDeleteConfig(id);
  }

  // ── Pricing Calculation ──────────────────────────────────────

  async calculate(
    workspaceId: string,
    dto: CalculatePricingDto,
    triggeredBy: string,
  ): Promise<PricingCalculationResponseDto> {
    const input = this.dtoToInput(dto);
    const config = await this.repository.findActiveConfig(workspaceId, dto.marketplaceKey, dto.country);
    const strategy = this.strategyEngine.selectBestStrategy(input, config);
    const result = this.calculationEngine.calculate(input, config, strategy);

    const validationReport = this.validationEngine.validate({
      result,
      config,
      marketplaceKey: dto.marketplaceKey,
      country: dto.country ?? PRICING_CONSTANTS.DEFAULT_COUNTRY,
      currency: dto.currency ?? config?.currency ?? PRICING_CONSTANTS.DEFAULT_CURRENCY,
    });

    // Persist the record
    const version = await this.repository.getNextVersion(
      dto.catalogProductId, workspaceId, dto.marketplaceKey,
    );

    const record = await this.repository.createRecord({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      configId: config?.id ?? null,
      marketplaceKey: dto.marketplaceKey,
      country: dto.country ?? PRICING_CONSTANTS.DEFAULT_COUNTRY,
      currency: dto.currency ?? config?.currency ?? PRICING_CONSTANTS.DEFAULT_CURRENCY,
      strategy,
      status: validationReport.isValid ? PricingStatus.CALCULATED : PricingStatus.FAILED,
      version,
      baseCost: dto.baseCost ?? null,
      landedCost: dto.landedCost ?? null,
      procurementCost: dto.procurementCost ?? null,
      totalCost: result.totalCost,
      suggestedSellingPrice: result.suggestedSellingPrice,
      marketplaceSellingPrice: result.marketplaceSellingPrice,
      compareAtPrice: result.compareAtPrice,
      estimatedProfit: result.estimatedProfit,
      estimatedMarginPct: result.estimatedMarginPct,
      estimatedRoi: result.estimatedRoi,
      manualOverridePrice: dto.manualOverridePrice ?? null,
      manualOverrideBy: dto.manualOverridePrice ? triggeredBy : null,
      manualOverrideAt: dto.manualOverridePrice ? new Date() : null,
      scheduledPrice: dto.scheduledPrice ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      isValid: validationReport.isValid,
      validationErrors: validationReport.isValid ? [] : validationReport.errors,
      calculationMeta: { breakdown: result.breakdown, warnings: result.warnings },
      calculationSource: 'API',
      createdBy: triggeredBy,
      updatedBy: triggeredBy,
    });

    await this.eventQueue.enqueue({
      pricingRecordId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      marketplaceKey: dto.marketplaceKey,
      event: validationReport.isValid ? PricingEvent.GENERATED : PricingEvent.VALIDATION_FAILED,
      triggeredBy,
    });

    return PricingCalculationResponseDto.from(result, record['id'] as string);
  }

  async queueCalculation(
    workspaceId: string,
    dto: CalculatePricingDto,
    triggeredBy: string,
  ): Promise<PricingRecordResponseDto> {
    const version = await this.repository.getNextVersion(
      dto.catalogProductId, workspaceId, dto.marketplaceKey,
    );

    const record = await this.repository.createRecord({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      configId: null,
      marketplaceKey: dto.marketplaceKey,
      country: dto.country ?? PRICING_CONSTANTS.DEFAULT_COUNTRY,
      currency: dto.currency ?? PRICING_CONSTANTS.DEFAULT_CURRENCY,
      strategy: dto.strategy ?? PRICING_CONSTANTS.DEFAULT_STRATEGY,
      status: PricingStatus.DRAFT,
      version,
      baseCost: dto.baseCost ?? null,
      landedCost: dto.landedCost ?? null,
      procurementCost: dto.procurementCost ?? null,
      isValid: false,
      createdBy: triggeredBy,
      updatedBy: triggeredBy,
    });

    await this.calculationQueue.enqueue({
      pricingRecordId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      marketplaceKey: dto.marketplaceKey,
      input: this.dtoToInput(dto),
      triggeredBy,
    });

    return PricingRecordResponseDto.from(record);
  }

  async bulkCalculate(
    workspaceId: string,
    dto: BulkCalculatePricingDto,
    triggeredBy: string,
  ): Promise<BulkPricingResult> {
    if (dto.items.length > PRICING_CONSTANTS.MAX_BULK_ITEMS) {
      throw new BadRequestException(`Bulk pricing supports at most ${PRICING_CONSTANTS.MAX_BULK_ITEMS} items`);
    }

    let succeeded = 0;
    let failed = 0;
    const results: BulkPricingResult['results'] = [];

    for (const item of dto.items) {
      try {
        const resp = await this.queueCalculation(workspaceId, item, triggeredBy);
        results.push({ catalogProductId: item.catalogProductId, recordId: resp.id });
        succeeded++;
      } catch (error) {
        failed++;
        results.push({
          catalogProductId: item.catalogProductId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { succeeded, failed, results };
  }

  async simulate(
    workspaceId: string,
    dto: SimulatePricingDto,
  ): Promise<PricingCalculationResponseDto> {
    const cost = dto.landedCost ?? dto.baseCost;
    const result = this.calculationEngine.simulate(
      cost,
      dto.strategy,
      (dto.feeOverrides ?? {}) as Record<string, number>,
      (dto.thresholdOverrides ?? {}) as Record<string, number>,
    );
    return PricingCalculationResponseDto.from(result);
  }

  async compareAcrossMarketplaces(
    workspaceId: string,
    catalogProductId: string,
  ): Promise<PricingComparisonRow[]> {
    const records = await this.repository.findRecordsByProduct(catalogProductId, workspaceId);
    return records.map((r) => ({
      marketplaceKey: r['marketplaceKey'] as string,
      country: r['country'] as string,
      strategy: r['strategy'] as PricingStrategy,
      sellingPrice: (r['marketplaceSellingPrice'] as number) ?? 0,
      profit: (r['estimatedProfit'] as number) ?? 0,
      marginPct: (r['estimatedMarginPct'] as number) ?? 0,
      roi: (r['estimatedRoi'] as number) ?? 0,
      isViable: (r['isValid'] as boolean) ?? false,
    }));
  }

  // ── Record Management ────────────────────────────────────────

  async findAllRecords(
    workspaceId: string,
    filter: PricingRecordFilterDto,
  ): Promise<PricingListResponseDto> {
    const [items, total] = await this.repository.findAllRecords(workspaceId, filter);
    return PricingListResponseDto.from(items, total, filter.page ?? 1, filter.limit ?? 20);
  }

  async findRecordById(id: string, workspaceId: string): Promise<PricingRecordResponseDto> {
    const record = await this.repository.findRecordById(id, workspaceId);
    if (!record) throw new NotFoundException(`Pricing record ${id} not found`);
    return PricingRecordResponseDto.from(record);
  }

  async getHistory(id: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    await this.findRecordOrFail(id, workspaceId);
    return this.repository.findHistory(id, workspaceId);
  }

  async approveRecord(
    id: string,
    workspaceId: string,
    dto: ApprovePricingDto,
    approvedBy: string,
  ): Promise<PricingRecordResponseDto> {
    const record = await this.findRecordOrFail(id, workspaceId);
    this.assertTransition(record['status'] as PricingStatus, PricingStatus.APPROVED);

    const updated = await this.repository.updateRecord(id, workspaceId, {
      status: PricingStatus.APPROVED,
      approvedBy,
      approvedAt: new Date(),
    });

    await this.eventQueue.enqueue({
      pricingRecordId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplaceKey: record['marketplaceKey'] as string,
      event: PricingEvent.APPROVED,
      triggeredBy: approvedBy,
    });

    return PricingRecordResponseDto.from(updated);
  }

  async archiveRecord(id: string, workspaceId: string, reason?: string): Promise<void> {
    const record = await this.findRecordOrFail(id, workspaceId);
    this.assertTransition(record['status'] as PricingStatus, PricingStatus.ARCHIVED);
    await this.repository.softDeleteRecord(id);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async findConfigOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findConfigById(id, workspaceId);
    if (!record) throw new NotFoundException(`Pricing config ${id} not found`);
    return record;
  }

  private async findRecordOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findRecordById(id, workspaceId);
    if (!record) throw new NotFoundException(`Pricing record ${id} not found`);
    return record;
  }

  private assertTransition(current: PricingStatus, next: PricingStatus): void {
    const allowed = PRICING_CONSTANTS.ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot transition pricing from ${current} to ${next}`);
    }
  }

  private dtoToInput(dto: CalculatePricingDto): PricingInput {
    return {
      catalogProductId: dto.catalogProductId,
      workspaceId: '',
      marketplaceKey: dto.marketplaceKey,
      country: dto.country,
      currency: dto.currency,
      strategy: dto.strategy,
      baseCost: dto.baseCost,
      landedCost: dto.landedCost,
      procurementCost: dto.procurementCost,
      feeOverrides: dto.feeOverrides as Record<string, number> | undefined,
      manualOverridePrice: dto.manualOverridePrice,
      competitorPrice: dto.competitorPrice,
      scheduledPrice: dto.scheduledPrice,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    };
  }

  private flattenConfigDto(dto: UpdatePricingConfigDto): Record<string, unknown> {
    return {
      ...(dto.marketplaceKey !== undefined && { marketplaceKey: dto.marketplaceKey }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.strategy !== undefined && { strategy: dto.strategy }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      ...(dto.commissionPct !== undefined && { commissionPct: dto.commissionPct }),
      ...(dto.fulfilmentFeeFlat !== undefined && { fulfilmentFeeFlat: dto.fulfilmentFeeFlat }),
      ...(dto.shippingFeeFlat !== undefined && { shippingFeeFlat: dto.shippingFeeFlat }),
      ...(dto.paymentProcessingPct !== undefined && { paymentProcessingPct: dto.paymentProcessingPct }),
      ...(dto.packagingCostFlat !== undefined && { packagingCostFlat: dto.packagingCostFlat }),
      ...(dto.advertisingCostPct !== undefined && { advertisingCostPct: dto.advertisingCostPct }),
      ...(dto.taxPct !== undefined && { taxPct: dto.taxPct }),
      ...(dto.targetMarginPct !== undefined && { targetMarginPct: dto.targetMarginPct }),
      ...(dto.targetRoi !== undefined && { targetRoi: dto.targetRoi }),
      ...(dto.minProfitFlat !== undefined && { minProfitFlat: dto.minProfitFlat }),
      ...(dto.minMarginPct !== undefined && { minMarginPct: dto.minMarginPct }),
      ...(dto.marketplacePriceAdjustmentPct !== undefined && { marketplacePriceAdjustmentPct: dto.marketplacePriceAdjustmentPct }),
      ...(dto.regionalPriceAdjustmentPct !== undefined && { regionalPriceAdjustmentPct: dto.regionalPriceAdjustmentPct }),
      ...(dto.currencyConversionRate !== undefined && { currencyConversionRate: dto.currencyConversionRate }),
      ...(dto.rules !== undefined && { rules: dto.rules }),
    };
  }
}
