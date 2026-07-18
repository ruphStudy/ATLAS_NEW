import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { QuotationComparisonRepository } from './quotation-comparison.repository';
import { QuotationComparisonQueue } from './jobs';
import { ComparisonEngine } from './engine/comparison.engine';
import {
  ComparisonEngineInput,
  ComparisonStatus,
  ComparisonWeights,
  QuotationComparedJobPayload,
  SupplierScoreBreakdown,
} from './interfaces';
import {
  CreateQuotationComparisonDto,
  QuotationComparisonListResponseDto,
  QuotationComparisonResponseDto,
  QuotationComparisonFilterDto,
  SelectSupplierDto,
} from './dto';
import { QUOTATION_COMPARISON_CONSTANTS } from './constants';

@Injectable()
export class QuotationComparisonService {
  private readonly logger = new Logger(QuotationComparisonService.name);

  constructor(
    private readonly repository: QuotationComparisonRepository,
    private readonly engine: ComparisonEngine,
    private readonly queue: QuotationComparisonQueue,
    private readonly prisma: PrismaService,
  ) {}

  // ── Create / Revise ──────────────────────────────────────────

  async compare(
    workspaceId: string,
    dto: CreateQuotationComparisonDto,
  ): Promise<QuotationComparisonResponseDto> {
    // Load RFQ with supplier responses
    const rfqModel = (this.prisma as unknown as Record<string, unknown>)['rfq'] as Record<string, unknown>;
    const rfq = await (rfqModel['findFirst'] as (a: unknown) => Promise<Record<string, unknown> | null>)({
      where: { id: dto.rfqId, workspaceId, deletedAt: null },
      include: { supplierResponses: true },
    });

    if (!rfq) throw new NotFoundException(`RFQ not found: ${dto.rfqId}`);

    const supplierResponses = (rfq['supplierResponses'] as Record<string, unknown>[]) ?? [];
    const respondedResponses = supplierResponses.filter(
      (sr) => sr['quotedPrice'] !== null,
    );

    if (!respondedResponses.length) {
      throw new BadRequestException('No supplier responses with quoted prices found for this RFQ');
    }

    // Load supplier profiles for score data
    const supplierIds = respondedResponses.map((sr) => sr['supplierId'] as string);
    const supplierModel = (this.prisma as unknown as Record<string, unknown>)['supplier'] as Record<string, unknown>;
    const suppliers = await (supplierModel['findMany'] as (a: unknown) => Promise<Record<string, unknown>[]>)({
      where: { id: { in: supplierIds }, workspaceId, deletedAt: null },
      select: {
        id: true,
        verificationScore: true,
        riskScore: true,
        performanceScore: true,
        certifications: true,
      },
    });

    const supplierMap = new Map(suppliers.map((s) => [s['id'] as string, s]));

    // Build engine inputs
    const quantity = rfq['quantity'] as number;
    const inputs: ComparisonEngineInput[] = respondedResponses.map((sr) => {
      const profile = supplierMap.get(sr['supplierId'] as string);
      const certifications: string[] = Array.isArray(profile?.['certifications'])
        ? (profile!['certifications'] as { name?: string }[]).map((c) => c?.name ?? '').filter(Boolean)
        : [];

      return {
        supplierId: sr['supplierId'] as string,
        rfqSupplierId: sr['id'] as string,
        providerCode: (sr['providerCode'] as string | null) ?? null,
        providerQuotationRef: (sr['providerQuotationRef'] as string | null) ?? null,
        quotedUnitPrice: (sr['quotedPrice'] as number | null) ?? null,
        quotedQuantity: quantity,
        quotedMoq: (sr['quotedMoq'] as number | null) ?? null,
        quotedLeadTimeDays: (sr['quotedLeadTimeDays'] as number | null) ?? null,
        paymentTerms: (sr['paymentTerms'] as string | null) ?? null,
        shippingTerms: (sr['shippingTerms'] as string | null) ?? null,
        certifications,
        verificationScore: (profile?.['verificationScore'] as number | null) ?? null,
        riskScore: (profile?.['riskScore'] as number | null) ?? null,
        performanceScore: (profile?.['performanceScore'] as number | null) ?? null,
      };
    });

    // Run comparison engine
    const breakdowns = this.engine.compare(inputs, dto.weights as Partial<ComparisonWeights>);
    const bestBreakdown = [...breakdowns].sort((a, b) => b.comparisonScore - a.comparisonScore)[0];

    // Resolve weights that were actually used
    const resolvedWeights: ComparisonWeights = {
      ...QUOTATION_COMPARISON_CONSTANTS.DEFAULT_WEIGHTS,
      ...(dto.weights ?? {}),
    };

    // Archive previous versions
    const previous = await this.repository.findLatestByRfq(dto.rfqId, workspaceId);
    if (previous) {
      await this.repository.update(previous['id'] as string, { status: ComparisonStatus.REVISED });
    }

    const version = await this.repository.getNextVersion(dto.rfqId, workspaceId);

    const record = await this.repository.create({
      workspaceId,
      rfqId: dto.rfqId,
      version,
      status: ComparisonStatus.COMPLETED,
      weights: resolvedWeights as unknown as Record<string, unknown>,
      supplierBreakdowns: breakdowns as unknown as Record<string, unknown>[],
      recommendedSupplierId: bestBreakdown?.supplierId ?? null,
      selectedSupplierId: null,
      selectionReason: null,
      selectionBy: null,
      selectionAt: null,
      notes: dto.notes ?? null,
    });

    await this.queue.enqueue({
      comparisonId: record['id'] as string,
      rfqId: dto.rfqId,
      workspaceId,
      event: QUOTATION_COMPARISON_CONSTANTS.EVENTS.COMPARED,
    });

    this.logger.log(`Quotation comparison v${version} created for RFQ ${dto.rfqId}`);
    return this.mapToResponse(record);
  }

  // ── Select supplier ───────────────────────────────────────────

  async selectSupplier(
    id: string,
    workspaceId: string,
    dto: SelectSupplierDto,
    selectedBy: string,
  ): Promise<QuotationComparisonResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] === ComparisonStatus.ARCHIVED) {
      throw new BadRequestException('Cannot select supplier on an archived comparison');
    }

    // Validate that supplierId is one of the compared suppliers
    const breakdowns = record['supplierBreakdowns'] as SupplierScoreBreakdown[];
    const exists = breakdowns.some((b) => b.supplierId === dto.supplierId);
    if (!exists) {
      throw new BadRequestException(
        `Supplier ${dto.supplierId} is not part of this comparison`,
      );
    }

    const updated = await this.repository.update(id, {
      selectedSupplierId: dto.supplierId,
      selectionReason: dto.reason ?? null,
      selectionBy: selectedBy,
      selectionAt: new Date(),
    });

    await this.queue.enqueue({
      comparisonId: id,
      rfqId: updated['rfqId'] as string,
      workspaceId,
      event: QUOTATION_COMPARISON_CONSTANTS.EVENTS.SUPPLIER_SELECTED,
      selectedSupplierId: dto.supplierId,
    });

    this.logger.log(`Supplier ${dto.supplierId} selected for comparison ${id}`);
    return this.mapToResponse(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: QuotationComparisonFilterDto,
  ): Promise<QuotationComparisonListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<QuotationComparisonResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async findLatestByRfq(rfqId: string, workspaceId: string): Promise<QuotationComparisonResponseDto> {
    const record = await this.repository.findLatestByRfq(rfqId, workspaceId);
    if (!record) throw new NotFoundException(`No comparison found for RFQ: ${rfqId}`);
    return this.mapToResponse(record);
  }

  async findHistory(
    rfqId: string,
    workspaceId: string,
  ): Promise<QuotationComparisonResponseDto[]> {
    const records = await this.repository.findHistoryByRfq(rfqId, workspaceId);
    return records.map((r) => this.mapToResponse(r));
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    return this.repository.getStats(workspaceId);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.getOrThrow(id, workspaceId);
    await this.repository.softDelete(id);
    this.logger.log(`Quotation comparison ${id} soft-deleted`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Quotation comparison not found: ${id}`);
    return record;
  }

  private mapToResponse(r: Record<string, unknown>): QuotationComparisonResponseDto {
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      rfqId: r['rfqId'] as string,
      version: r['version'] as number,
      status: r['status'] as ComparisonStatus,
      weights: r['weights'] as ComparisonWeights,
      supplierBreakdowns: r['supplierBreakdowns'] as SupplierScoreBreakdown[],
      recommendedSupplierId: r['recommendedSupplierId'] as string | null,
      selectedSupplierId: r['selectedSupplierId'] as string | null,
      selectionReason: r['selectionReason'] as string | null,
      selectionBy: r['selectionBy'] as string | null,
      selectionAt: r['selectionAt'] as Date | null,
      notes: r['notes'] as string | null,
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }
}
