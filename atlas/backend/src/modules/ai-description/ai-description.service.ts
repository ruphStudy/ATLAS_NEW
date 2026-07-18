import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AiDescriptionRepository } from './ai-description.repository';
import {
  AiDescriptionEventQueue,
  AiGenerationQueue,
} from './jobs';
import { AiQualityScoreEngine } from './engine/ai-quality-score.engine';
import {
  AiDescriptionEvent,
  AiDescriptionStatus,
  AiProvider,
  DescriptionSection,
  GeneratedContent,
  GenerationTone,
} from './interfaces';
import {
  AiDescriptionFilterDto,
  AiDescriptionHistoryResponseDto,
  AiDescriptionListResponseDto,
  AiDescriptionResponseDto,
  AiDescriptionStatsDto,
  ApproveDescriptionDto,
  CreateAiDescriptionDto,
  ManualEditDto,
  RegenerateSectionsDto,
} from './dto';
import { AI_DESCRIPTION_CONSTANTS } from './constants';

@Injectable()
export class AiDescriptionService {
  private readonly logger = new Logger(AiDescriptionService.name);

  constructor(
    private readonly repository: AiDescriptionRepository,
    private readonly eventQueue: AiDescriptionEventQueue,
    private readonly generationQueue: AiGenerationQueue,
    private readonly scoreEngine: AiQualityScoreEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`AI description ${id} not found`);
    return record;
  }

  private assertTransition(current: AiDescriptionStatus, next: AiDescriptionStatus): void {
    const allowed = AI_DESCRIPTION_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition AI description from ${current} to ${next}`,
      );
    }
  }

  // ── Create & Enqueue Generation ───────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateAiDescriptionDto,
    createdBy: string,
  ): Promise<AiDescriptionResponseDto> {
    const version = await this.repository.getNextVersion(dto.catalogProductId, workspaceId);
    const sections = dto.sections ?? (AI_DESCRIPTION_CONSTANTS.ALL_SECTIONS as DescriptionSection[]);
    const language = dto.language ?? AI_DESCRIPTION_CONSTANTS.DEFAULT_LANGUAGE;
    const model = dto.model ?? this.defaultModel(dto.provider);

    const record = await this.repository.create({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      status: AiDescriptionStatus.PENDING,
      version,
      provider: dto.provider,
      model,
      tone: dto.tone,
      language,
      promptTemplateId: dto.promptTemplateId ?? null,
      content: {},
      aiQualityScore: null,
      tokensUsed: null,
      generationCostUsd: null,
      errorMessage: null,
      failedAt: null,
      generationStartedAt: null,
      generationCompletedAt: null,
    });

    await this.repository.createHistoryEntry({
      descriptionId: record['id'] as string,
      workspaceId,
      fromStatus: AiDescriptionStatus.PENDING,
      toStatus: AiDescriptionStatus.PENDING,
      version,
      sectionsRegenerated: null,
      reason: 'Description request created',
      changedBy: createdBy,
      snapshotContent: null,
    });

    // Enqueue AI generation job
    await this.generationQueue.enqueue({
      descriptionId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      provider: dto.provider,
      model,
      tone: dto.tone,
      language,
      sections,
      isRegeneration: false,
      triggeredBy: createdBy,
    });

    return AiDescriptionResponseDto.from(record);
  }

  // ── Regenerate Sections ───────────────────────────────────────

  async regenerateSections(
    id: string,
    workspaceId: string,
    dto: RegenerateSectionsDto,
    userId: string,
  ): Promise<AiDescriptionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as AiDescriptionStatus;
    this.assertTransition(current, AiDescriptionStatus.GENERATING);

    const provider = (dto.provider ?? record['provider']) as AiProvider;
    const model = dto.model ?? (record['model'] as string) ?? this.defaultModel(provider);
    const tone = (dto.tone ?? record['tone']) as GenerationTone;
    const language = dto.language ?? (record['language'] as string);

    await this.generationQueue.enqueue({
      descriptionId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      provider,
      model,
      tone,
      language,
      sections: dto.sections,
      isRegeneration: true,
      triggeredBy: userId,
    });

    return AiDescriptionResponseDto.from(record);
  }

  // ── Manual Edit ───────────────────────────────────────────────

  async manualEdit(
    id: string,
    workspaceId: string,
    dto: ManualEditDto,
    userId: string,
  ): Promise<AiDescriptionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as AiDescriptionStatus;

    if (
      current === AiDescriptionStatus.PENDING ||
      current === AiDescriptionStatus.GENERATING
    ) {
      throw new BadRequestException('Cannot manually edit a description that is still generating');
    }

    const existingContent = (record['content'] as GeneratedContent) ?? {};
    const mergedContent: GeneratedContent = { ...existingContent, ...dto.content };

    const aiQualityScore = this.scoreEngine.calculate({
      content: mergedContent,
      requestedSections: AI_DESCRIPTION_CONSTANTS.ALL_SECTIONS as DescriptionSection[],
    });

    const updated = await this.repository.update(id, workspaceId, {
      status: AiDescriptionStatus.MANUALLY_EDITED,
      content: mergedContent,
      aiQualityScore,
    });

    await this.repository.createHistoryEntry({
      descriptionId: id,
      workspaceId,
      fromStatus: current,
      toStatus: AiDescriptionStatus.MANUALLY_EDITED,
      version: record['version'] as number,
      sectionsRegenerated: null,
      reason: dto.notes ?? 'Manual edit',
      changedBy: userId,
      snapshotContent: mergedContent,
    });

    return AiDescriptionResponseDto.from(updated);
  }

  // ── Approve ───────────────────────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveDescriptionDto,
    userId: string,
  ): Promise<AiDescriptionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as AiDescriptionStatus;
    this.assertTransition(current, AiDescriptionStatus.APPROVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: AiDescriptionStatus.APPROVED,
    });

    await this.repository.createHistoryEntry({
      descriptionId: id,
      workspaceId,
      fromStatus: current,
      toStatus: AiDescriptionStatus.APPROVED,
      version: record['version'] as number,
      sectionsRegenerated: null,
      reason: dto.notes ?? 'Approved',
      changedBy: userId,
      snapshotContent: null,
    });

    await this.eventQueue.enqueue({
      descriptionId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      event: AiDescriptionEvent.APPROVED,
      triggeredBy: userId,
    });

    return AiDescriptionResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: AiDescriptionFilterDto): Promise<AiDescriptionListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return AiDescriptionListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<AiDescriptionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return AiDescriptionResponseDto.from(record);
  }

  async findByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<AiDescriptionResponseDto[]> {
    const items = await this.repository.findByCatalogProductId(catalogProductId, workspaceId);
    return items.map(AiDescriptionResponseDto.from);
  }

  async getLatestByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<AiDescriptionResponseDto | null> {
    const record = await this.repository.findLatestByCatalogProductId(catalogProductId, workspaceId);
    return record ? AiDescriptionResponseDto.from(record) : null;
  }

  async getStats(workspaceId: string): Promise<AiDescriptionStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new AiDescriptionStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.byProvider = raw['byProvider'] as Record<string, number>;
    dto.byTone = raw['byTone'] as Record<string, number>;
    dto.averageQualityScore = raw['averageQualityScore'] as number;
    dto.totalTokensUsed = raw['totalTokensUsed'] as number;
    dto.totalCostUsd = raw['totalCostUsd'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<AiDescriptionHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(AiDescriptionHistoryResponseDto.from);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as AiDescriptionStatus;
    if (status === AiDescriptionStatus.GENERATING) {
      throw new BadRequestException('Cannot delete a description that is currently generating');
    }
    await this.repository.softDelete(id);
  }

  // ── Private ───────────────────────────────────────────────────

  private defaultModel(provider: AiProvider): string {
    const key = `DEFAULT_MODEL_${provider}` as keyof typeof AI_DESCRIPTION_CONSTANTS;
    return (AI_DESCRIPTION_CONSTANTS[key] as string | undefined) ?? 'gpt-4o';
  }
}
