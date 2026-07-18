import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListingRepository } from './listing.repository';
import { ListingEventQueue, ListingGenerationQueue, MarketplaceListingTransformQueue } from './jobs';
import { ListingQualityEngine } from './engine/listing-quality.engine';
import { ListingBuilderEngine } from './engine/listing-builder.engine';
import { MarketplaceListingEngine } from './engine/marketplace-listing.engine';
import {
  ListingContent,
  ListingEvent,
  ListingMarketplace,
  ListingSection,
  ListingStatus,
  MarketplaceListingStatus,
} from './interfaces';
import {
  ApproveListingDto,
  ArchiveListingDto,
  CreateListingDto,
  ListingFilterDto,
  ListingHistoryResponseDto,
  ListingListResponseDto,
  ListingResponseDto,
  ListingStatsDto,
  ManualListingEditDto,
  PublishListingDto,
  RegenerateListingSectionsDto,
  SubmitForApprovalDto,
  CreateUniversalListingDto,
  RegenerateUniversalListingDto,
  UniversalListingFilterDto,
  UniversalListingListResponseDto,
  UniversalListingResponseDto,
  TransformToMarketplaceDto,
  TransformToMultipleMarketplacesDto,
  MarketplaceListingFilterDto,
  MarketplaceListingResponseDto,
} from './dto';
import { LISTING_CONSTANTS } from './constants';

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private readonly repository: ListingRepository,
    private readonly eventQueue: ListingEventQueue,
    private readonly generationQueue: ListingGenerationQueue,
    private readonly marketplaceTransformQueue: MarketplaceListingTransformQueue,
    private readonly qualityEngine: ListingQualityEngine,
    private readonly builderEngine: ListingBuilderEngine,
    private readonly marketplaceEngine: MarketplaceListingEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Listing ${id} not found`);
    return record;
  }

  private assertTransition(current: ListingStatus, next: ListingStatus): void {
    const allowed = LISTING_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Cannot transition listing from ${current} to ${next}`);
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateListingDto,
    createdBy: string,
  ): Promise<ListingResponseDto> {
    const version = await this.repository.getNextVersion(
      dto.catalogProductId,
      workspaceId,
      dto.marketplace,
    );
    const sections = dto.sections ?? (LISTING_CONSTANTS.ALL_SECTIONS as ListingSection[]);

    const record = await this.repository.create({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      marketplace: dto.marketplace,
      status: ListingStatus.DRAFT,
      version,
      aiDescriptionId: dto.aiDescriptionId ?? null,
      aiImageSetId: dto.aiImageSetId ?? null,
      aiSeoId: dto.aiSeoId ?? null,
      templateId: dto.templateId ?? null,
      content: {},
      qualityScore: null,
      validationResult: null,
      errorMessage: null,
      failedAt: null,
      generationStartedAt: null,
      generationCompletedAt: null,
      externalListingId: null,
    });

    await this.repository.createHistoryEntry({
      listingId: record['id'] as string,
      workspaceId,
      fromStatus: ListingStatus.DRAFT,
      toStatus: ListingStatus.DRAFT,
      version,
      sectionsUpdated: null,
      reason: 'Listing created',
      changedBy: createdBy,
      snapshotContent: null,
    });

    await this.generationQueue.enqueue({
      listingId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      marketplace: dto.marketplace,
      sections,
      templateId: dto.templateId,
      aiDescriptionId: dto.aiDescriptionId,
      aiImageSetId: dto.aiImageSetId,
      aiSeoId: dto.aiSeoId,
      isRegeneration: false,
      triggeredBy: createdBy,
    });

    return ListingResponseDto.from(record);
  }

  // ── Preview ───────────────────────────────────────────────────

  async preview(
    id: string,
    workspaceId: string,
  ): Promise<{ content: ListingContent; validationResult: unknown }> {
    const record = await this.findOrFail(id, workspaceId);
    const content = (record['content'] as ListingContent) ?? {};
    const validationResult = this.qualityEngine.validate(content);
    return { content, validationResult };
  }

  // ── Regenerate Sections ───────────────────────────────────────

  async regenerateSections(
    id: string,
    workspaceId: string,
    dto: RegenerateListingSectionsDto,
    userId: string,
  ): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ListingStatus;
    this.assertTransition(current, ListingStatus.GENERATING);

    await this.generationQueue.enqueue({
      listingId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as ListingMarketplace,
      sections: dto.sections,
      aiDescriptionId: dto.aiDescriptionId ?? (record['aiDescriptionId'] as string | undefined),
      aiImageSetId: dto.aiImageSetId ?? (record['aiImageSetId'] as string | undefined),
      aiSeoId: dto.aiSeoId ?? (record['aiSeoId'] as string | undefined),
      isRegeneration: true,
      triggeredBy: userId,
    });

    return ListingResponseDto.from(record);
  }

  // ── Manual Edit ───────────────────────────────────────────────

  async manualEdit(
    id: string,
    workspaceId: string,
    dto: ManualListingEditDto,
    userId: string,
  ): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ListingStatus;

    if (current === ListingStatus.GENERATING) {
      throw new BadRequestException('Cannot manually edit a listing that is currently generating');
    }

    const existingContent = (record['content'] as ListingContent) ?? {};
    const mergedContent: ListingContent = { ...existingContent, ...dto.content };
    const validationResult = this.qualityEngine.validate(mergedContent);

    const updated = await this.repository.update(id, workspaceId, {
      status: ListingStatus.MANUALLY_EDITED,
      content: mergedContent,
      qualityScore: validationResult.qualityScore,
      validationResult,
    });

    await this.repository.createHistoryEntry({
      listingId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ListingStatus.MANUALLY_EDITED,
      version: record['version'] as number,
      sectionsUpdated: null,
      reason: dto.notes ?? 'Manual edit',
      changedBy: userId,
      snapshotContent: mergedContent,
    });

    await this.eventQueue.enqueue({
      listingId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace,
      event: ListingEvent.UPDATED,
      triggeredBy: userId,
    });

    return ListingResponseDto.from(updated);
  }

  // ── Submit for Approval ───────────────────────────────────────

  async submitForApproval(
    id: string,
    workspaceId: string,
    dto: SubmitForApprovalDto,
    userId: string,
  ): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ListingStatus;
    this.assertTransition(current, ListingStatus.READY_FOR_APPROVAL);

    const updated = await this.repository.update(id, workspaceId, {
      status: ListingStatus.READY_FOR_APPROVAL,
    });

    await this.repository.createHistoryEntry({
      listingId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ListingStatus.READY_FOR_APPROVAL,
      version: record['version'] as number,
      sectionsUpdated: null,
      reason: dto.notes ?? 'Submitted for approval',
      changedBy: userId,
      snapshotContent: null,
    });

    await this.eventQueue.enqueue({
      listingId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as ListingMarketplace,
      event: ListingEvent.READY_FOR_APPROVAL,
      triggeredBy: userId,
    });

    return ListingResponseDto.from(updated);
  }

  // ── Approve ───────────────────────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveListingDto,
    userId: string,
  ): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ListingStatus;
    this.assertTransition(current, ListingStatus.APPROVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: ListingStatus.APPROVED,
    });

    await this.repository.createHistoryEntry({
      listingId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ListingStatus.APPROVED,
      version: record['version'] as number,
      sectionsUpdated: null,
      reason: dto.notes ?? 'Approved',
      changedBy: userId,
      snapshotContent: null,
    });

    await this.eventQueue.enqueue({
      listingId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as ListingMarketplace,
      event: ListingEvent.APPROVED,
      triggeredBy: userId,
    });

    return ListingResponseDto.from(updated);
  }

  // ── Publish ───────────────────────────────────────────────────

  async publish(
    id: string,
    workspaceId: string,
    dto: PublishListingDto,
    userId: string,
  ): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ListingStatus;
    this.assertTransition(current, ListingStatus.PUBLISHED);

    const updated = await this.repository.update(id, workspaceId, {
      status: ListingStatus.PUBLISHED,
      ...(dto.externalListingId && { externalListingId: dto.externalListingId }),
    });

    await this.repository.createHistoryEntry({
      listingId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ListingStatus.PUBLISHED,
      version: record['version'] as number,
      sectionsUpdated: null,
      reason: dto.notes ?? 'Published',
      changedBy: userId,
      snapshotContent: null,
    });

    await this.eventQueue.enqueue({
      listingId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as ListingMarketplace,
      event: ListingEvent.PUBLISHED,
      triggeredBy: userId,
      metadata: { externalListingId: dto.externalListingId },
    });

    return ListingResponseDto.from(updated);
  }

  // ── Archive ───────────────────────────────────────────────────

  async archive(
    id: string,
    workspaceId: string,
    dto: ArchiveListingDto,
    userId: string,
  ): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ListingStatus;
    this.assertTransition(current, ListingStatus.ARCHIVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: ListingStatus.ARCHIVED,
    });

    await this.repository.createHistoryEntry({
      listingId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ListingStatus.ARCHIVED,
      version: record['version'] as number,
      sectionsUpdated: null,
      reason: dto.reason ?? 'Archived',
      changedBy: userId,
      snapshotContent: null,
    });

    return ListingResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: ListingFilterDto): Promise<ListingListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return ListingListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<ListingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return ListingResponseDto.from(record);
  }

  async findByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<ListingResponseDto[]> {
    const items = await this.repository.findByCatalogProductId(catalogProductId, workspaceId);
    return items.map(ListingResponseDto.from);
  }

  async getLatestByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
    marketplace?: ListingMarketplace,
  ): Promise<ListingResponseDto | null> {
    const record = await this.repository.findLatestByCatalogProductId(
      catalogProductId,
      workspaceId,
      marketplace,
    );
    return record ? ListingResponseDto.from(record) : null;
  }

  async getStats(workspaceId: string): Promise<ListingStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new ListingStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.byMarketplace = raw['byMarketplace'] as Record<string, number>;
    dto.averageQualityScore = raw['averageQualityScore'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<ListingHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(ListingHistoryResponseDto.from);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as ListingStatus;
    if (status === ListingStatus.GENERATING) {
      throw new BadRequestException('Cannot delete a listing that is currently generating');
    }
    await this.repository.softDelete(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // UNIVERSAL LISTING
  // ═══════════════════════════════════════════════════════════════

  async createUniversalListing(
    workspaceId: string,
    dto: CreateUniversalListingDto,
    createdBy: string,
  ): Promise<UniversalListingResponseDto> {
    const version = await this.repository.getNextUniversalVersion(dto.catalogProductId, workspaceId);
    const sections = dto.sections ?? (LISTING_CONSTANTS.ALL_SECTIONS as ListingSection[]);

    const record = await this.repository.createUniversalListing({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      status: ListingStatus.DRAFT,
      version,
      aiDescriptionId: dto.aiDescriptionId ?? null,
      aiImageSetId: dto.aiImageSetId ?? null,
      aiSeoId: dto.aiSeoId ?? null,
      templateId: dto.templateId ?? null,
      content: {},
      qualityScore: null,
      validationResult: null,
      createdBy,
      updatedBy: createdBy,
    });

    await this.repository.createUniversalListingHistory({
      universalListingId: record['id'] as string,
      workspaceId,
      fromStatus: ListingStatus.DRAFT,
      toStatus: ListingStatus.DRAFT,
      version,
      sectionsUpdated: null,
      reason: 'Universal listing created',
      changedBy: createdBy,
      snapshotContent: null,
    });

    // Queue generation
    await this.eventQueue.enqueue({
      listingId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      marketplace: ListingMarketplace.CUSTOM, // not marketplace-specific, placeholder
      event: ListingEvent.GENERATED,
      triggeredBy: createdBy,
    });

    return UniversalListingResponseDto.from(record);
  }

  async findAllUniversalListings(
    workspaceId: string,
    filter: UniversalListingFilterDto,
  ): Promise<UniversalListingListResponseDto> {
    const [items, total] = await this.repository.findAllUniversalListings(workspaceId, filter);
    return UniversalListingListResponseDto.from(items, total, filter.page ?? 1, filter.limit ?? 20);
  }

  async findUniversalListingById(id: string, workspaceId: string): Promise<UniversalListingResponseDto> {
    const record = await this.repository.findUniversalListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Universal listing ${id} not found`);
    return UniversalListingResponseDto.from(record);
  }

  async findUniversalListingsByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<UniversalListingResponseDto[]> {
    const items = await this.repository.findUniversalListingsByCatalogProduct(catalogProductId, workspaceId);
    return items.map(UniversalListingResponseDto.from);
  }

  async getUniversalListingHistory(id: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    const record = await this.repository.findUniversalListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Universal listing ${id} not found`);
    return this.repository.findUniversalListingHistory(id, workspaceId);
  }

  async regenerateUniversalListing(
    id: string,
    workspaceId: string,
    dto: RegenerateUniversalListingDto,
    userId: string,
  ): Promise<UniversalListingResponseDto> {
    const record = await this.repository.findUniversalListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Universal listing ${id} not found`);

    const updated = await this.repository.updateUniversalListing(id, workspaceId, {
      status: ListingStatus.GENERATING,
      generationStartedAt: new Date(),
      updatedBy: userId,
    });

    await this.repository.createUniversalListingHistory({
      universalListingId: id,
      workspaceId,
      fromStatus: record['status'] as string,
      toStatus: ListingStatus.GENERATING,
      version: record['version'] as number,
      sectionsUpdated: dto.sections,
      reason: 'Regeneration requested',
      changedBy: userId,
      snapshotContent: null,
    });

    return UniversalListingResponseDto.from(updated);
  }

  async previewUniversalListing(id: string, workspaceId: string): Promise<{
    content: ListingContent;
    qualityScore: number | null;
    validationResult: unknown;
  }> {
    const record = await this.repository.findUniversalListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Universal listing ${id} not found`);
    const content = (record['content'] as ListingContent) ?? {};
    const validationResult = this.qualityEngine.validate(content);
    return {
      content,
      qualityScore: validationResult.qualityScore,
      validationResult,
    };
  }

  async deleteUniversalListing(id: string, workspaceId: string): Promise<void> {
    const record = await this.repository.findUniversalListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Universal listing ${id} not found`);
    await this.repository.softDeleteUniversalListing(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKETPLACE LISTING
  // ═══════════════════════════════════════════════════════════════

  async transformToMarketplace(
    universalListingId: string,
    workspaceId: string,
    dto: TransformToMarketplaceDto,
    triggeredBy: string,
  ): Promise<MarketplaceListingResponseDto> {
    const universal = await this.repository.findUniversalListingById(universalListingId, workspaceId);
    if (!universal) throw new NotFoundException(`Universal listing ${universalListingId} not found`);

    const mpListing = await this.repository.createMarketplaceListing({
      workspaceId,
      universalListingId,
      catalogProductId: universal['catalogProductId'] as string,
      marketplaceKey: dto.marketplaceKey,
      country: dto.country ?? 'GLOBAL',
      status: MarketplaceListingStatus.PENDING_TRANSFORMATION,
      version: 1,
      isDryRun: dto.isDryRun ?? false,
      triggeredBy,
      createdBy: triggeredBy,
      updatedBy: triggeredBy,
    });

    await this.marketplaceTransformQueue.enqueue({
      marketplaceListingId: mpListing['id'] as string,
      universalListingId,
      catalogProductId: universal['catalogProductId'] as string,
      workspaceId,
      marketplaceKey: dto.marketplaceKey,
      country: dto.country ?? 'GLOBAL',
      isDryRun: dto.isDryRun ?? false,
      triggeredBy,
    });

    await this.eventQueue.enqueue({
      listingId: universalListingId,
      catalogProductId: universal['catalogProductId'] as string,
      workspaceId,
      marketplace: dto.marketplaceKey as never,
      event: ListingEvent.MARKETPLACE_GENERATED,
      triggeredBy,
      metadata: { marketplaceKey: dto.marketplaceKey, country: dto.country },
    });

    return MarketplaceListingResponseDto.from(mpListing);
  }

  async transformToMultipleMarketplaces(
    universalListingId: string,
    workspaceId: string,
    dto: TransformToMultipleMarketplacesDto,
    triggeredBy: string,
  ): Promise<MarketplaceListingResponseDto[]> {
    const results: MarketplaceListingResponseDto[] = [];
    for (const target of dto.targets) {
      const result = await this.transformToMarketplace(
        universalListingId,
        workspaceId,
        target,
        triggeredBy,
      );
      results.push(result);
    }
    return results;
  }

  async findAllMarketplaceListings(
    workspaceId: string,
    filter: MarketplaceListingFilterDto,
  ): Promise<{ data: MarketplaceListingResponseDto[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.repository.findAllMarketplaceListings(workspaceId, filter);
    return {
      data: items.map(MarketplaceListingResponseDto.from),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findMarketplaceListingById(id: string, workspaceId: string): Promise<MarketplaceListingResponseDto> {
    const record = await this.repository.findMarketplaceListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Marketplace listing ${id} not found`);
    return MarketplaceListingResponseDto.from(record);
  }

  async findMarketplaceListingsByUniversalId(
    universalListingId: string,
    workspaceId: string,
  ): Promise<MarketplaceListingResponseDto[]> {
    const items = await this.repository.findMarketplaceListingsByUniversalId(universalListingId, workspaceId);
    return items.map(MarketplaceListingResponseDto.from);
  }

  async getMarketplaceListingHistory(id: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    const record = await this.repository.findMarketplaceListingById(id, workspaceId);
    if (!record) throw new NotFoundException(`Marketplace listing ${id} not found`);
    return this.repository.findMarketplaceListingHistory(id, workspaceId);
  }

  async previewMarketplaceTransformation(
    universalListingId: string,
    workspaceId: string,
    marketplaceKey: string,
    country?: string,
  ): Promise<unknown> {
    const universal = await this.repository.findUniversalListingById(universalListingId, workspaceId);
    if (!universal) throw new NotFoundException(`Universal listing ${universalListingId} not found`);

    const content = (universal['content'] as ListingContent) ?? {};
    return this.marketplaceEngine.transform(
      universalListingId,
      universal['catalogProductId'] as string,
      content,
      marketplaceKey,
      { isDryRun: true, country: country ?? 'GLOBAL', workspaceId },
    );
  }
}
