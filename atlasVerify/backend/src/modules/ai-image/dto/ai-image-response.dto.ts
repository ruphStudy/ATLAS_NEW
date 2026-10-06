import { AiImageProvider, AiImageStatus, ImageType } from '../interfaces';

export class AiImageHistoryResponseDto {
  id!: string;
  imageSetId!: string;
  workspaceId!: string;
  fromStatus!: AiImageStatus;
  toStatus!: AiImageStatus;
  version!: number;
  imageTypesRegenerated?: ImageType[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotImageUrls?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): AiImageHistoryResponseDto {
    const dto = new AiImageHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.imageSetId = raw['imageSetId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as AiImageStatus;
    dto.toStatus = raw['toStatus'] as AiImageStatus;
    dto.version = raw['version'] as number;
    dto.imageTypesRegenerated = (raw['imageTypesRegenerated'] as ImageType[]) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshotImageUrls = raw['snapshotImageUrls'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class AiImageSetResponseDto {
  id!: string;
  workspaceId!: string;
  catalogProductId!: string;
  status!: AiImageStatus;
  version!: number;
  provider!: AiImageProvider;
  model?: string | null;
  promptTemplateId?: string | null;
  basePrompt?: string | null;
  negativePrompt?: string | null;
  images!: unknown[];
  imageQualityScore?: number | null;
  imagesGenerated?: number | null;
  generationCostUsd?: number | null;
  errorMessage?: string | null;
  failedAt?: Date | null;
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): AiImageSetResponseDto {
    const dto = new AiImageSetResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.status = raw['status'] as AiImageStatus;
    dto.version = raw['version'] as number;
    dto.provider = raw['provider'] as AiImageProvider;
    dto.model = (raw['model'] as string | null) ?? null;
    dto.promptTemplateId = (raw['promptTemplateId'] as string | null) ?? null;
    dto.basePrompt = (raw['basePrompt'] as string | null) ?? null;
    dto.negativePrompt = (raw['negativePrompt'] as string | null) ?? null;
    dto.images = (raw['images'] as unknown[]) ?? [];
    dto.imageQualityScore = (raw['imageQualityScore'] as number | null) ?? null;
    dto.imagesGenerated = (raw['imagesGenerated'] as number | null) ?? null;
    dto.generationCostUsd = (raw['generationCostUsd'] as number | null) ?? null;
    dto.errorMessage = (raw['errorMessage'] as string | null) ?? null;
    dto.failedAt = (raw['failedAt'] as Date | null) ?? null;
    dto.generationStartedAt = (raw['generationStartedAt'] as Date | null) ?? null;
    dto.generationCompletedAt = (raw['generationCompletedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class AiImageSetListResponseDto {
  data!: AiImageSetResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): AiImageSetListResponseDto {
    const dto = new AiImageSetListResponseDto();
    dto.data = items.map(AiImageSetResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class AiImageStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  byProvider!: Record<string, number>;
  averageQualityScore!: number;
  totalImagesGenerated!: number;
  totalCostUsd!: number;
}
