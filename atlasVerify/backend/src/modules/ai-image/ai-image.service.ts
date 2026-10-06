import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AiImageRepository } from './ai-image.repository';
import { AiImageEventQueue, AiImageGenerationQueue } from './jobs';
import { ImageQualityScoreEngine } from './engine/image-quality-score.engine';
import { AiImageGenerationEngine } from './engine/ai-image-generation.engine';
import {
  AiImageEvent,
  AiImageProvider,
  AiImageStatus,
  AspectRatio,
  BatchImageRequest,
  GeneratedImage,
  ImageResolution,
  ImageStyle,
  ImageType,
} from './interfaces';
import {
  AiImageFilterDto,
  AiImageHistoryResponseDto,
  AiImageSetListResponseDto,
  AiImageSetResponseDto,
  AiImageStatsDto,
  ApproveAllImagesDto,
  ApproveImageDto,
  CreateAiImageSetDto,
  ManualUploadImageDto,
  RegenerateImagesDto,
} from './dto';
import { AI_IMAGE_CONSTANTS } from './constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AiImageService {
  private readonly logger = new Logger(AiImageService.name);

  constructor(
    private readonly repository: AiImageRepository,
    private readonly eventQueue: AiImageEventQueue,
    private readonly generationQueue: AiImageGenerationQueue,
    private readonly scoreEngine: ImageQualityScoreEngine,
    private readonly generationEngine: AiImageGenerationEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`AI image set ${id} not found`);
    return record;
  }

  private assertTransition(current: AiImageStatus, next: AiImageStatus): void {
    const allowed = AI_IMAGE_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition image set from ${current} to ${next}`,
      );
    }
  }

  private buildDefaultRequests(provider: AiImageProvider): BatchImageRequest[] {
    return [
      {
        imageType: ImageType.MAIN_PRODUCT,
        style: ImageStyle.STUDIO,
        aspectRatio: AspectRatio.SQUARE_1_1,
        resolution: ImageResolution.HD_1024,
      },
      {
        imageType: ImageType.WHITE_BACKGROUND,
        style: ImageStyle.STUDIO,
        aspectRatio: AspectRatio.SQUARE_1_1,
        resolution: ImageResolution.HD_1024,
      },
      {
        imageType: ImageType.LIFESTYLE,
        style: ImageStyle.LIFESTYLE,
        aspectRatio: AspectRatio.LANDSCAPE_16_9,
        resolution: ImageResolution.HD_1024,
      },
    ];
  }

  // ── Create & Trigger Generation ───────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateAiImageSetDto,
    createdBy: string,
  ): Promise<AiImageSetResponseDto> {
    const version = await this.repository.getNextVersion(dto.catalogProductId, workspaceId);
    const model = dto.model ?? this.generationEngine.defaultModel(dto.provider);
    const requests = dto.requests ?? this.buildDefaultRequests(dto.provider);

    const record = await this.repository.create({
      workspaceId,
      catalogProductId: dto.catalogProductId,
      status: AiImageStatus.PENDING,
      version,
      provider: dto.provider,
      model,
      promptTemplateId: dto.promptTemplateId ?? null,
      basePrompt: dto.basePrompt ?? null,
      negativePrompt: dto.negativePrompt ?? null,
      images: [],
      imageQualityScore: null,
      imagesGenerated: null,
      generationCostUsd: null,
      errorMessage: null,
      failedAt: null,
      generationStartedAt: null,
      generationCompletedAt: null,
    });

    await this.repository.createHistoryEntry({
      imageSetId: record['id'] as string,
      workspaceId,
      fromStatus: AiImageStatus.PENDING,
      toStatus: AiImageStatus.PENDING,
      version,
      imageTypesRegenerated: null,
      reason: 'Image set created',
      changedBy: createdBy,
      snapshotImageUrls: null,
    });

    await this.generationQueue.enqueue({
      imageSetId: record['id'] as string,
      catalogProductId: dto.catalogProductId,
      workspaceId,
      provider: dto.provider,
      model,
      requests,
      basePrompt: dto.basePrompt,
      negativePrompt: dto.negativePrompt,
      isRegeneration: false,
      triggeredBy: createdBy,
    });

    return AiImageSetResponseDto.from(record);
  }

  // ── Regenerate Specific Images ────────────────────────────────

  async regenerateImages(
    id: string,
    workspaceId: string,
    dto: RegenerateImagesDto,
    userId: string,
  ): Promise<AiImageSetResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as AiImageStatus;
    this.assertTransition(current, AiImageStatus.GENERATING);

    const provider = (dto.provider ?? record['provider']) as AiImageProvider;
    const model = dto.model ?? (record['model'] as string) ?? this.generationEngine.defaultModel(provider);

    const requests: BatchImageRequest[] = dto.requests ?? dto.imageTypes.map((imageType) => ({
      imageType,
      style: ImageStyle.STUDIO,
      aspectRatio: AspectRatio.SQUARE_1_1,
      resolution: ImageResolution.HD_1024,
    }));

    await this.generationQueue.enqueue({
      imageSetId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      provider,
      model,
      requests,
      basePrompt: (record['basePrompt'] as string) ?? undefined,
      negativePrompt: (record['negativePrompt'] as string) ?? undefined,
      isRegeneration: true,
      triggeredBy: userId,
    });

    return AiImageSetResponseDto.from(record);
  }

  // ── Manual Upload ─────────────────────────────────────────────

  async manualUpload(
    id: string,
    workspaceId: string,
    dto: ManualUploadImageDto,
    userId: string,
  ): Promise<AiImageSetResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as AiImageStatus;

    if (current === AiImageStatus.GENERATING) {
      throw new BadRequestException('Cannot upload images while generation is in progress');
    }

    const existingImages = (record['images'] as GeneratedImage[]) ?? [];
    // Replace image of same type + imageId, or append
    const idx = existingImages.findIndex((img) => img.imageId === dto.imageId);
    const newImage: GeneratedImage = {
      imageId: dto.imageId,
      imageType: dto.imageType,
      url: dto.url,
      thumbnailUrl: dto.thumbnailUrl,
      style: dto.style,
      aspectRatio: dto.aspectRatio,
      resolution: dto.resolution,
      mimeType: dto.mimeType,
      isApproved: false,
      generatedAt: new Date(),
    };

    const updatedImages = idx >= 0
      ? existingImages.map((img, i) => (i === idx ? newImage : img))
      : [...existingImages, newImage];

    const imageQualityScore = this.scoreEngine.calculate({
      images: updatedImages,
      requestedImageTypes: updatedImages.map((i) => i.imageType),
    });

    const updated = await this.repository.update(id, workspaceId, {
      status: AiImageStatus.MANUALLY_UPLOADED,
      images: updatedImages,
      imageQualityScore,
    });

    await this.repository.createHistoryEntry({
      imageSetId: id,
      workspaceId,
      fromStatus: current,
      toStatus: AiImageStatus.MANUALLY_UPLOADED,
      version: record['version'] as number,
      imageTypesRegenerated: [dto.imageType],
      reason: dto.notes ?? 'Manual image upload',
      changedBy: userId,
      snapshotImageUrls: [{ imageId: dto.imageId, url: dto.url, imageType: dto.imageType }],
    });

    return AiImageSetResponseDto.from(updated);
  }

  // ── Approve Images ────────────────────────────────────────────

  async approveImages(
    id: string,
    workspaceId: string,
    dto: ApproveImageDto,
    userId: string,
  ): Promise<AiImageSetResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as AiImageStatus;
    this.assertTransition(current, AiImageStatus.APPROVED);

    const existingImages = (record['images'] as GeneratedImage[]) ?? [];
    const approvedIds = new Set(dto.approvedImageIds ?? existingImages.map((i) => i.imageId));

    const updatedImages = existingImages.map((img) => ({
      ...img,
      isApproved: approvedIds.has(img.imageId),
    }));

    const imageQualityScore = this.scoreEngine.calculate({
      images: updatedImages,
      requestedImageTypes: updatedImages.map((i) => i.imageType),
    });

    const updated = await this.repository.update(id, workspaceId, {
      status: AiImageStatus.APPROVED,
      images: updatedImages,
      imageQualityScore,
    });

    await this.repository.createHistoryEntry({
      imageSetId: id,
      workspaceId,
      fromStatus: current,
      toStatus: AiImageStatus.APPROVED,
      version: record['version'] as number,
      imageTypesRegenerated: null,
      reason: dto.notes ?? 'Images approved',
      changedBy: userId,
      snapshotImageUrls: null,
    });

    await this.eventQueue.enqueue({
      imageSetId: id,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId,
      event: AiImageEvent.APPROVED,
      triggeredBy: userId,
    });

    return AiImageSetResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: AiImageFilterDto): Promise<AiImageSetListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return AiImageSetListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<AiImageSetResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return AiImageSetResponseDto.from(record);
  }

  async findByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<AiImageSetResponseDto[]> {
    const items = await this.repository.findByCatalogProductId(catalogProductId, workspaceId);
    return items.map(AiImageSetResponseDto.from);
  }

  async getLatestByCatalogProduct(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<AiImageSetResponseDto | null> {
    const record = await this.repository.findLatestByCatalogProductId(catalogProductId, workspaceId);
    return record ? AiImageSetResponseDto.from(record) : null;
  }

  async getStats(workspaceId: string): Promise<AiImageStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new AiImageStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.byProvider = raw['byProvider'] as Record<string, number>;
    dto.averageQualityScore = raw['averageQualityScore'] as number;
    dto.totalImagesGenerated = raw['totalImagesGenerated'] as number;
    dto.totalCostUsd = raw['totalCostUsd'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<AiImageHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(AiImageHistoryResponseDto.from);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as AiImageStatus;
    if (status === AiImageStatus.GENERATING) {
      throw new BadRequestException('Cannot delete an image set that is currently generating');
    }
    await this.repository.softDelete(id);
  }
}
