import {
  PublicationMarketplace,
  PublicationStatus,
  PublishTrigger,
  SyncStatus,
} from '../interfaces';

export class PublicationHistoryResponseDto {
  id!: string;
  publicationId!: string;
  workspaceId!: string;
  fromStatus!: PublicationStatus;
  toStatus!: PublicationStatus;
  publicationVersion!: number;
  trigger!: PublishTrigger;
  reason?: string | null;
  changedBy?: string | null;
  marketplaceListingId?: string | null;
  errorMessage?: string | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): PublicationHistoryResponseDto {
    const dto = new PublicationHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.publicationId = raw['publicationId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as PublicationStatus;
    dto.toStatus = raw['toStatus'] as PublicationStatus;
    dto.publicationVersion = raw['publicationVersion'] as number;
    dto.trigger = raw['trigger'] as PublishTrigger;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.marketplaceListingId = (raw['marketplaceListingId'] as string | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class PublicationResponseDto {
  id!: string;
  workspaceId!: string;
  listingId!: string;
  catalogProductId!: string;
  marketplace!: PublicationMarketplace;
  status!: PublicationStatus;
  publicationVersion!: number;
  marketplaceListingId?: string | null;
  marketplaceUrl?: string | null;
  marketplaceResponse?: unknown;
  trigger!: PublishTrigger;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  unpublishedAt?: Date | null;
  syncStatus!: SyncStatus;
  lastSyncedAt?: Date | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  retryCount!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): PublicationResponseDto {
    const dto = new PublicationResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.listingId = raw['listingId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.marketplace = raw['marketplace'] as PublicationMarketplace;
    dto.status = raw['status'] as PublicationStatus;
    dto.publicationVersion = raw['publicationVersion'] as number;
    dto.marketplaceListingId = (raw['marketplaceListingId'] as string | null) ?? null;
    dto.marketplaceUrl = (raw['marketplaceUrl'] as string | null) ?? null;
    dto.marketplaceResponse = raw['marketplaceResponse'] ?? null;
    dto.trigger = raw['trigger'] as PublishTrigger;
    dto.scheduledAt = (raw['scheduledAt'] as Date | null) ?? null;
    dto.publishedAt = (raw['publishedAt'] as Date | null) ?? null;
    dto.unpublishedAt = (raw['unpublishedAt'] as Date | null) ?? null;
    dto.syncStatus = (raw['syncStatus'] as SyncStatus) ?? SyncStatus.UNKNOWN;
    dto.lastSyncedAt = (raw['lastSyncedAt'] as Date | null) ?? null;
    dto.errorCode = (raw['errorCode'] as string | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.failedAt = (raw['failedAt'] as Date | null) ?? null;
    dto.retryCount = (raw['retryCount'] as number) ?? 0;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class PublicationListResponseDto {
  data!: PublicationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): PublicationListResponseDto {
    const dto = new PublicationListResponseDto();
    dto.data = items.map(PublicationResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class PublicationStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  byMarketplace!: Record<string, number>;
  bySyncStatus!: Record<string, number>;
  publishedCount!: number;
  failedCount!: number;
  pendingCount!: number;
}

export class BulkPublishResultDto {
  queued!: number;
  skipped!: number;
  errors!: { listingId: string; reason: string }[];
}
