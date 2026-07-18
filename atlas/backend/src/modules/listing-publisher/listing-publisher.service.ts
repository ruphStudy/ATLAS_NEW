import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListingPublisherRepository } from './listing-publisher.repository';
import {
  BulkPublishQueue,
  PublicationEventQueue,
  PublishQueue,
} from './jobs';
import { MarketplaceAdapterEngine } from './engine/marketplace-adapter.engine';
import {
  PublicationEvent,
  PublicationMarketplace,
  PublicationStatus,
  PublishTrigger,
  SyncStatus,
} from './interfaces';
import {
  ArchivePublicationDto,
  BulkPublishDto,
  BulkPublishResultDto,
  PublicationFilterDto,
  PublicationHistoryResponseDto,
  PublicationListResponseDto,
  PublicationResponseDto,
  PublicationStatsDto,
  PublishListingDto,
  RepublishListingDto,
  RetryPublicationDto,
  UnpublishListingDto,
} from './dto';
import { LISTING_PUBLISHER_CONSTANTS } from './constants';

@Injectable()
export class ListingPublisherService {
  private readonly logger = new Logger(ListingPublisherService.name);

  constructor(
    private readonly repository: ListingPublisherRepository,
    private readonly publishQueue: PublishQueue,
    private readonly bulkPublishQueue: BulkPublishQueue,
    private readonly eventQueue: PublicationEventQueue,
    private readonly adapterEngine: MarketplaceAdapterEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Publication ${id} not found`);
    return record;
  }

  private assertTransition(current: PublicationStatus, next: PublicationStatus): void {
    const allowed = LISTING_PUBLISHER_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition publication from ${current} to ${next}`,
      );
    }
  }

  // ── Publish ───────────────────────────────────────────────────

  async publish(
    workspaceId: string,
    dto: PublishListingDto,
    userId: string,
  ): Promise<PublicationResponseDto> {
    // Duplicate guard: prevent re-publishing an already active publication
    const existing = await this.repository.findByListingAndMarketplace(
      dto.listingId,
      dto.marketplace,
      workspaceId,
    );

    if (
      existing &&
      (existing['status'] === PublicationStatus.PUBLISHING ||
        existing['status'] === PublicationStatus.PUBLISHED)
    ) {
      throw new ConflictException(
        `Listing ${dto.listingId} is already ${existing['status']} on ${dto.marketplace}`,
      );
    }

    const version = await this.repository.getNextVersion(
      dto.listingId,
      dto.marketplace,
      workspaceId,
    );

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : undefined;

    const record = await this.repository.create({
      workspaceId,
      listingId: dto.listingId,
      catalogProductId: dto.catalogProductId,
      marketplace: dto.marketplace,
      status: PublicationStatus.PENDING,
      publicationVersion: version,
      marketplaceListingId: null,
      marketplaceUrl: null,
      marketplaceResponse: null,
      trigger: scheduledAt ? PublishTrigger.SCHEDULED : PublishTrigger.MANUAL,
      scheduledAt,
      publishedAt: null,
      unpublishedAt: null,
      syncStatus: SyncStatus.UNKNOWN,
      lastSyncedAt: null,
      errorCode: null,
      errorMessage: null,
      failedAt: null,
      retryCount: 0,
    });

    await this.repository.createHistoryEntry({
      publicationId: record['id'] as string,
      workspaceId,
      fromStatus: PublicationStatus.PENDING,
      toStatus: PublicationStatus.PENDING,
      publicationVersion: version,
      trigger: record['trigger'] as PublishTrigger,
      reason: dto.notes ?? 'Publication requested',
      changedBy: userId,
      marketplaceListingId: null,
      errorMessage: null,
    });

    await this.publishQueue.enqueue(
      {
        publicationId: record['id'] as string,
        listingId: dto.listingId,
        catalogProductId: dto.catalogProductId,
        workspaceId,
        marketplace: dto.marketplace,
        trigger: record['trigger'] as PublishTrigger,
        triggeredBy: userId,
        retryCount: 0,
      },
      delay,
    );

    return PublicationResponseDto.from(record);
  }

  // ── Bulk Publish ─────────────────────────────────────────────

  async bulkPublish(
    workspaceId: string,
    dto: BulkPublishDto,
    userId: string,
  ): Promise<BulkPublishResultDto> {
    const result = new BulkPublishResultDto();
    result.queued = 0;
    result.skipped = 0;
    result.errors = [];

    const validItems: typeof dto.items = [];

    for (const item of dto.items) {
      try {
        const existing = await this.repository.findByListingAndMarketplace(
          item.listingId,
          item.marketplace as PublicationMarketplace,
          workspaceId,
        );

        if (
          existing &&
          (existing['status'] === PublicationStatus.PUBLISHING ||
            existing['status'] === PublicationStatus.PUBLISHED)
        ) {
          result.skipped++;
          continue;
        }

        validItems.push(item);
        result.queued++;
      } catch (error) {
        result.errors.push({
          listingId: item.listingId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (validItems.length > 0) {
      await this.bulkPublishQueue.enqueue({
        workspaceId,
        items: validItems.map((i) => ({
          listingId: i.listingId,
          catalogProductId: i.catalogProductId,
          marketplace: i.marketplace as PublicationMarketplace,
          scheduledAt: i.scheduledAt ? new Date(i.scheduledAt) : null,
        })),
        triggeredBy: userId,
      });
    }

    return result;
  }

  // ── Republish ─────────────────────────────────────────────────

  async republish(
    id: string,
    workspaceId: string,
    dto: RepublishListingDto,
    userId: string,
  ): Promise<PublicationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as PublicationStatus;
    this.assertTransition(current, PublicationStatus.PUBLISHING);

    const nextVersion = (record['publicationVersion'] as number) + 1;

    await this.repository.update(id, workspaceId, {
      status: PublicationStatus.PENDING,
      publicationVersion: nextVersion,
      errorMessage: null,
      errorCode: null,
      failedAt: null,
      syncStatus: SyncStatus.UNKNOWN,
    });

    await this.repository.createHistoryEntry({
      publicationId: id,
      workspaceId,
      fromStatus: current,
      toStatus: PublicationStatus.PENDING,
      publicationVersion: nextVersion,
      trigger: PublishTrigger.REPUBLISH,
      reason: dto.notes ?? 'Republish requested',
      changedBy: userId,
      marketplaceListingId: record['marketplaceListingId'] as string | null,
      errorMessage: null,
    });

    await this.publishQueue.enqueue({
      publicationId: id,
      listingId: record['listingId'] as string,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as PublicationMarketplace,
      trigger: PublishTrigger.REPUBLISH,
      triggeredBy: userId,
      retryCount: 0,
    });

    const updated = await this.repository.findById(id, workspaceId);
    return PublicationResponseDto.from(updated!);
  }

  // ── Retry ─────────────────────────────────────────────────────

  async retry(
    id: string,
    workspaceId: string,
    dto: RetryPublicationDto,
    userId: string,
  ): Promise<PublicationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as PublicationStatus;
    this.assertTransition(current, PublicationStatus.PUBLISHING);

    const currentRetryCount = (record['retryCount'] as number) ?? 0;
    if (currentRetryCount >= LISTING_PUBLISHER_CONSTANTS.MAX_RETRY_COUNT) {
      throw new BadRequestException(
        `Maximum retry count (${LISTING_PUBLISHER_CONSTANTS.MAX_RETRY_COUNT}) reached for publication ${id}`,
      );
    }

    await this.repository.update(id, workspaceId, {
      status: PublicationStatus.PENDING,
      errorMessage: null,
      errorCode: null,
      failedAt: null,
    });

    await this.repository.createHistoryEntry({
      publicationId: id,
      workspaceId,
      fromStatus: current,
      toStatus: PublicationStatus.PENDING,
      publicationVersion: record['publicationVersion'] as number,
      trigger: PublishTrigger.RETRY,
      reason: dto.notes ?? 'Retry requested',
      changedBy: userId,
      marketplaceListingId: record['marketplaceListingId'] as string | null,
      errorMessage: null,
    });

    await this.publishQueue.enqueue({
      publicationId: id,
      listingId: record['listingId'] as string,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as PublicationMarketplace,
      trigger: PublishTrigger.RETRY,
      triggeredBy: userId,
      retryCount: currentRetryCount + 1,
    });

    const updated = await this.repository.findById(id, workspaceId);
    return PublicationResponseDto.from(updated!);
  }

  // ── Unpublish ─────────────────────────────────────────────────

  async unpublish(
    id: string,
    workspaceId: string,
    dto: UnpublishListingDto,
    userId: string,
  ): Promise<PublicationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as PublicationStatus;
    this.assertTransition(current, PublicationStatus.UNPUBLISHED);

    const marketplaceListingId = record['marketplaceListingId'] as string | null;
    if (marketplaceListingId) {
      await this.adapterEngine.unpublish(
        record['marketplace'] as PublicationMarketplace,
        marketplaceListingId,
      );
    }

    const updated = await this.repository.update(id, workspaceId, {
      status: PublicationStatus.UNPUBLISHED,
      unpublishedAt: new Date(),
      syncStatus: SyncStatus.OUT_OF_SYNC,
    });

    await this.repository.createHistoryEntry({
      publicationId: id,
      workspaceId,
      fromStatus: current,
      toStatus: PublicationStatus.UNPUBLISHED,
      publicationVersion: record['publicationVersion'] as number,
      trigger: PublishTrigger.MANUAL,
      reason: dto.reason ?? 'Unpublished by user',
      changedBy: userId,
      marketplaceListingId,
      errorMessage: null,
    });

    await this.eventQueue.enqueue({
      publicationId: id,
      listingId: record['listingId'] as string,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      marketplace: record['marketplace'] as PublicationMarketplace,
      event: PublicationEvent.UNPUBLISHED,
      triggeredBy: userId,
      metadata: { reason: dto.reason },
    });

    return PublicationResponseDto.from(updated);
  }

  // ── Archive ───────────────────────────────────────────────────

  async archive(
    id: string,
    workspaceId: string,
    dto: ArchivePublicationDto,
    userId: string,
  ): Promise<PublicationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as PublicationStatus;
    this.assertTransition(current, PublicationStatus.ARCHIVED);

    const updated = await this.repository.update(id, workspaceId, {
      status: PublicationStatus.ARCHIVED,
    });

    await this.repository.createHistoryEntry({
      publicationId: id,
      workspaceId,
      fromStatus: current,
      toStatus: PublicationStatus.ARCHIVED,
      publicationVersion: record['publicationVersion'] as number,
      trigger: PublishTrigger.MANUAL,
      reason: dto.reason ?? 'Archived',
      changedBy: userId,
      marketplaceListingId: record['marketplaceListingId'] as string | null,
      errorMessage: null,
    });

    return PublicationResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: PublicationFilterDto,
  ): Promise<PublicationListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return PublicationListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<PublicationResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return PublicationResponseDto.from(record);
  }

  async findByListing(
    listingId: string,
    workspaceId: string,
  ): Promise<PublicationResponseDto[]> {
    const items = await this.repository.findByListingId(listingId, workspaceId);
    return items.map(PublicationResponseDto.from);
  }

  async getStats(workspaceId: string): Promise<PublicationStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new PublicationStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.byMarketplace = raw['byMarketplace'] as Record<string, number>;
    dto.bySyncStatus = raw['bySyncStatus'] as Record<string, number>;
    dto.publishedCount = raw['publishedCount'] as number;
    dto.failedCount = raw['failedCount'] as number;
    dto.pendingCount = raw['pendingCount'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<PublicationHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(PublicationHistoryResponseDto.from);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as PublicationStatus;
    if (status === PublicationStatus.PUBLISHING) {
      throw new BadRequestException('Cannot delete a publication that is currently publishing');
    }
    await this.repository.softDelete(id);
  }
}
