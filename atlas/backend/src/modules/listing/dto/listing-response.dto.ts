import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ListingContent,
  ListingMarketplace,
  ListingSection,
  ListingStatus,
  ListingValidationResult,
} from '../interfaces';

export class ListingHistoryResponseDto {
  id!: string;
  listingId!: string;
  workspaceId!: string;
  fromStatus!: ListingStatus;
  toStatus!: ListingStatus;
  version!: number;
  @ApiPropertyOptional({ enum: ListingSection, isArray: true, nullable: true })
  sectionsUpdated?: ListingSection[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): ListingHistoryResponseDto {
    const dto = new ListingHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.listingId = raw['listingId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as ListingStatus;
    dto.toStatus = raw['toStatus'] as ListingStatus;
    dto.version = raw['version'] as number;
    dto.sectionsUpdated = (raw['sectionsUpdated'] as ListingSection[]) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshotContent = raw['snapshotContent'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class ListingResponseDto {
  id!: string;
  workspaceId!: string;
  catalogProductId!: string;
  marketplace!: ListingMarketplace;
  status!: ListingStatus;
  version!: number;
  aiDescriptionId?: string | null;
  aiImageSetId?: string | null;
  aiSeoId?: string | null;
  templateId?: string | null;
  content!: ListingContent;
  qualityScore?: number | null;
  validationResult?: ListingValidationResult | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;
  externalListingId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): ListingResponseDto {
    const dto = new ListingResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.marketplace = raw['marketplace'] as ListingMarketplace;
    dto.status = raw['status'] as ListingStatus;
    dto.version = raw['version'] as number;
    dto.aiDescriptionId = (raw['aiDescriptionId'] as string | null) ?? null;
    dto.aiImageSetId = (raw['aiImageSetId'] as string | null) ?? null;
    dto.aiSeoId = (raw['aiSeoId'] as string | null) ?? null;
    dto.templateId = (raw['templateId'] as string | null) ?? null;
    dto.content = (raw['content'] as ListingContent) ?? {};
    dto.qualityScore = (raw['qualityScore'] as number | null) ?? null;
    dto.validationResult = (raw['validationResult'] as ListingValidationResult | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.failedAt = (raw['failedAt'] as Date | null) ?? null;
    dto.generationStartedAt = (raw['generationStartedAt'] as Date | null) ?? null;
    dto.generationCompletedAt = (raw['generationCompletedAt'] as Date | null) ?? null;
    dto.externalListingId = (raw['externalListingId'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class ListingListResponseDto {
  data!: ListingResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): ListingListResponseDto {
    const dto = new ListingListResponseDto();
    dto.data = items.map(ListingResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class ListingStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  byMarketplace!: Record<string, number>;
  averageQualityScore!: number;
}
