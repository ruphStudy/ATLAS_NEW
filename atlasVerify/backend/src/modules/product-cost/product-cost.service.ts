import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProductCostRepository } from './product-cost.repository';
import { ProductCostQueue } from './jobs';
import { LandedCostEngine } from './engine/landed-cost.engine';
import {
  CostBreakdown,
  CostComponents,
  IProductCostCalculation,
} from './interfaces';
import {
  CreateProductCostDto,
  ProductCostFilterDto,
  ProductCostListResponseDto,
  ProductCostResponseDto,
} from './dto';
import { PRODUCT_COST_CONSTANTS } from './constants';

@Injectable()
export class ProductCostService {
  private readonly logger = new Logger(ProductCostService.name);

  constructor(
    private readonly repository: ProductCostRepository,
    private readonly engine: LandedCostEngine,
    private readonly queue: ProductCostQueue,
  ) {}

  // ── Calculate / Recalculate ──────────────────────────────────

  async calculate(workspaceId: string, dto: CreateProductCostDto): Promise<ProductCostResponseDto> {
    const inputs: CostComponents = {
      supplierUnitPrice: dto.supplierUnitPrice,
      quantity: dto.quantity,
      moq: dto.moq ?? null,
      shippingCost: dto.shippingCost ?? null,
      freightCost: dto.freightCost ?? null,
      customsDutyPercent: dto.customsDutyPercent ?? null,
      importCharges: dto.importCharges ?? null,
      packagingCostPerUnit: dto.packagingCostPerUnit ?? null,
      labelingCostPerUnit: dto.labelingCostPerUnit ?? null,
      inspectionCost: dto.inspectionCost ?? null,
      miscCharges: dto.miscCharges ?? null,
      sourceCurrency: dto.sourceCurrency ?? PRODUCT_COST_CONSTANTS.DEFAULT_CURRENCY,
      targetCurrency: dto.targetCurrency ?? PRODUCT_COST_CONSTANTS.DEFAULT_CURRENCY,
      exchangeRate: dto.exchangeRate ?? PRODUCT_COST_CONSTANTS.DEFAULT_EXCHANGE_RATE,
      taxPercent: dto.taxPercent ?? null,
    };

    const breakdown = this.engine.calculate(inputs);

    const contextKey = {
      productId: dto.productId,
      opportunityId: dto.opportunityId,
      rfqId: dto.rfqId,
      supplierId: dto.supplierId,
    };

    const version = await this.repository.getNextVersion(workspaceId, contextKey);
    const isRevision = version > 1;

    const record = await this.repository.create({
      workspaceId,
      productId: dto.productId ?? null,
      opportunityId: dto.opportunityId ?? null,
      rfqId: dto.rfqId ?? null,
      rfqSupplierId: dto.rfqSupplierId ?? null,
      supplierId: dto.supplierId ?? null,
      version,
      inputs: inputs as unknown as Record<string, unknown>,
      breakdown: breakdown as unknown as Record<string, unknown>,
      totalLandedCost: breakdown.totalLandedCost,
      costPerUnit: breakdown.costPerUnit,
      targetCurrency: breakdown.targetCurrency,
      notes: dto.notes ?? null,
    });

    await this.queue.enqueue({
      calculationId: record['id'] as string,
      workspaceId,
      event: isRevision
        ? PRODUCT_COST_CONSTANTS.EVENTS.RECALCULATED
        : PRODUCT_COST_CONSTANTS.EVENTS.CALCULATED,
      productId: dto.productId ?? null,
    });

    this.logger.log(
      `Product cost v${version} calculated: total=${breakdown.totalLandedCost} ${breakdown.targetCurrency}`,
    );
    return this.mapToResponse(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: ProductCostFilterDto): Promise<ProductCostListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<ProductCostResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async findLatestByProduct(productId: string, workspaceId: string): Promise<ProductCostResponseDto> {
    const record = await this.repository.findLatestByProduct(productId, workspaceId);
    if (!record) throw new NotFoundException(`No cost calculation found for product: ${productId}`);
    return this.mapToResponse(record);
  }

  async findLatestByRfqSupplier(rfqSupplierId: string, workspaceId: string): Promise<ProductCostResponseDto> {
    const record = await this.repository.findLatestByRfqSupplier(rfqSupplierId, workspaceId);
    if (!record) throw new NotFoundException(`No cost calculation found for RFQ supplier: ${rfqSupplierId}`);
    return this.mapToResponse(record);
  }

  async findHistoryByProduct(productId: string, workspaceId: string): Promise<ProductCostResponseDto[]> {
    const records = await this.repository.findHistoryByProduct(productId, workspaceId);
    return records.map((r) => this.mapToResponse(r));
  }

  async findHistoryByRfq(rfqId: string, workspaceId: string): Promise<ProductCostResponseDto[]> {
    const records = await this.repository.findHistoryByRfq(rfqId, workspaceId);
    return records.map((r) => this.mapToResponse(r));
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.getOrThrow(id, workspaceId);
    await this.repository.softDelete(id);
    this.logger.log(`Product cost calculation ${id} soft-deleted`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Product cost calculation not found: ${id}`);
    return record;
  }

  private mapToResponse(r: Record<string, unknown>): ProductCostResponseDto {
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      productId: r['productId'] as string | null,
      opportunityId: r['opportunityId'] as string | null,
      rfqId: r['rfqId'] as string | null,
      rfqSupplierId: r['rfqSupplierId'] as string | null,
      supplierId: r['supplierId'] as string | null,
      version: r['version'] as number,
      inputs: r['inputs'] as CostComponents,
      breakdown: r['breakdown'] as CostBreakdown,
      totalLandedCost: r['totalLandedCost'] as number,
      costPerUnit: r['costPerUnit'] as number,
      targetCurrency: r['targetCurrency'] as string,
      notes: r['notes'] as string | null,
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }
}
