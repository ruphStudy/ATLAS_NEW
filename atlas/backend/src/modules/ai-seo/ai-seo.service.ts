import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AiSeoRepository } from './ai-seo.repository';
import { SeoEventQueue, SeoOptimizationQueue } from './jobs';
import { SeoAnalysisEngine } from './engine/seo-analysis.engine';
import { SeoOptimizationEngine } from './engine/seo-optimization.engine';
import {
  OptimizedContent,
  SeoEvent,
  SeoProvider,
  SeoSection,
  SeoStatus,
} from './interfaces';
import {
  ApproveSeoDto,
  CreateSeoOptimizationDto,
  ManualSeoEditDto,
  RegenerateSeoSectionsDto,
  SeoFilterDto,
  SeoHistoryResponseDto,
  SeoOptimizationListResponseDto,
  SeoOptimizationResponseDto,
  SeoStatsDto,
} from './dto';
import { AI_SEO_CONSTANTS } from './constants';

@Injectable()
export class AiSeoService {
  private readonly logger = new Logger(AiSeoService.name);

  constructor(
    private readonly repository: AiSeoRepository,
    private readonly eventQueue: SeoEventQueue,
    private readonly optimizationQueue: SeoOptimizationQueue,
    private readonly analysisEngine: SeoAnalysisEngine,
    private readonly optimizationEngine: SeoOptimizationEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`SEO optimization ${id} not found`);
    return record;
  }

  private assertTransition(current: SeoStatus, next: SeoStatus): void {
    const allowed = AI_SEO_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot transition SEO from ${current} to ${next}`);
    }
  }

  // ── Create & Trigger Optimization ────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateSeoOptimizationDto,
    createdBy: string,
  ): Promise<SeoOptimizationResponseDto> {
    const version = await this.repository.getNextVersion(dto.catalogProductId, workspaceId);
    const sections = dto.sections ?? (AI_SEO_CONSTANTS.ALL_SECTIONS as SeoSection[]);
    const model = dto.model ?? this.optimizationEngine.defaultModel(dto.provider);

    const record = await this.repository.create({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      status: SeoStatus.PENDING,
      version,
      provider: dto.provider,
      model,
      marketplace: dto.marketplace ?? null,
      targetKeywords: dto.targetKeywords ?? [],
      promptTemplateId: dto.promptTemplateId ?? null,
      originalContent: null,
      optimizedContent: {},
      analysis: null,
      seoScore: null,
      tokensUsed: null,
      optimizationCostUsd: null,
      errorMessage: null,
      failedAt: null,
      optimizationStartedAt: null,
      optimizationCompletedAt: null,
    });

    await this.repository.createHistoryEntry({
      seoId: record['id'] as string,
      workspaceId,
      fromStatus: SeoStatus.PENDING,
      toStatus: SeoStatus.PENDING,
      version,
      sectionsOptimized: null,
      reason: 'SEO optimization request created',
      changedBy: createdBy,
      snapshotContent: null,
    });

    await this.optimizationQueue.enqueue({
      seoId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      provider: dto.provider,
      model,
      marketplace: dto.marketplace,
      targetKeywords: dto.targetKeywords,
      sections,
      isRegeneration: false,
      triggeredBy: createdBy,
    });

    return SeoOptimizationResponseDto.from(record);
  }

  // ── Regenerate Sections ───────────────────────────────────────

  async regenerateSections(
    id: string,
    workspaceId: string,
    dto: RegenerateSeoSectionsDto,
    userId: string,
  ): Promise<SeoOptimizationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as SeoStatus;
    this.assertTransition(current, SeoStatus.ANALYZING);

    const provider = (dto.provider ?? record['provider']) as SeoProvider;
    const model = dto.model ?? (record['model'] as string) ?? this.optimizationEngine.defaultModel(provider);
    const targetKeywords = dto.targetKeywords ?? (record['targetKeywords'] as string[]) ?? [];

    await this.optimizationQueue.enqueue({
      seoId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      provider,
      model,
      marketplace: (record['marketplace'] as string) ?? undefined,
      targetKeywords,
      sections: dto.sections,
      isRegeneration: true,
      triggeredBy: userId,
    });

    return SeoOptimizationResponseDto.from(record);
  }

  // ── Manual Edit ───────────────────────────────────────────────

  async manualEdit(
    id: string,
    workspaceId: string,
    dto: ManualSeoEditDto,
    userId: string,
  ): Promise<SeoOptimizationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as SeoStatus;

    if (current === SeoStatus.PENDING || current === SeoStatus.ANALYZING) {
      throw new BadRequestException('Cannot manually edit while optimization is in progress');
    }

    const existingContent = (record['optimizedContent'] as OptimizedContent) ?? {};
    const mergedContent: OptimizedContent = { ...existingContent, ...dto.content };

    const targetKeywords = (record['targetKeywords'] as string[]) ?? [];
    const analysis = this.analysisEngine.analyze(
      mergedContent,
      targetKeywords,
      AI_SEO_CONSTANTS.ALL_SECTIONS as SeoSection[],
    );

    const updated = await this.repository.update(id, workspaceId, {
      status: SeoStatus.MANUALLY_EDITED,
      optimizedContent: mergedContent,
      analysis,
      seoScore: analysis.seoScore,
    });

    await this.repository.createHistoryEntry({
      seoId: id,
      workspaceId,
      fromStatus: current,
      toStatus: SeoStatus.MANUALLY_EDITED,
      version: record['version'] as number,
      sectionsOptimized: null,
      reason: dto.notes ?? 'Manual edit',
      changedBy: userId,
      snapshotContent: mergedContent,
    });

    return SeoOptimizationResponseDto.from(updated);
  }

  // ── Approve ───────────────────────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveSeoDto,
    userId: string,
  ): Promise<SeoOptimizationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as SeoStatus;
    this.assertTransition(current, SeoStatus.APPROVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: SeoStatus.APPROVED,
    });

    await this.repository.createHistoryEntry({
      seoId: id,
      workspaceId,
      fromStatus: current,
      toStatus: SeoStatus.APPROVED,
      version: record['version'] as number,
      sectionsOptimized: null,
      reason: dto.notes ?? 'Approved',
      changedBy: userId,
      snapshotContent: null,
    });

    await this.eventQueue.enqueue({
      seoId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      event: SeoEvent.APPROVED,
      triggeredBy: userId,
    });

    return SeoOptimizationResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: SeoFilterDto): Promise<SeoOptimizationListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return SeoOptimizationListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<SeoOptimizationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return SeoOptimizationResponseDto.from(record);
  }

  async findByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<SeoOptimizationResponseDto[]> {
    const items = await this.repository.findByCatalogProductId(catalogProductId, workspaceId);
    return items.map(SeoOptimizationResponseDto.from);
  }

  async getLatestByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<SeoOptimizationResponseDto | null> {
    const record = await this.repository.findLatestByCatalogProductId(catalogProductId, workspaceId);
    return record ? SeoOptimizationResponseDto.from(record) : null;
  }

  async getStats(workspaceId: string): Promise<SeoStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new SeoStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.byProvider = raw['byProvider'] as Record<string, number>;
    dto.byMarketplace = raw['byMarketplace'] as Record<string, number>;
    dto.averageSeoScore = raw['averageSeoScore'] as number;
    dto.totalTokensUsed = raw['totalTokensUsed'] as number;
    dto.totalCostUsd = raw['totalCostUsd'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<SeoHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(SeoHistoryResponseDto.from);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as SeoStatus;
    if (status === SeoStatus.ANALYZING) {
      throw new BadRequestException('Cannot delete an SEO optimization that is currently running');
    }
    await this.repository.softDelete(id);
  }
}
