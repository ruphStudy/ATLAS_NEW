import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  AiImageEvent,
  AiImageGenerationJobPayload,
  AiImageStatus,
  GeneratedImage,
  ImageType,
} from '../interfaces';
import { AiImageGenerationEngine } from '../engine/ai-image-generation.engine';
import { ImageQualityScoreEngine } from '../engine/image-quality-score.engine';
import { AiImageRepository } from '../ai-image.repository';
import { AiImageEventQueue } from './ai-image-event.queue';

@Injectable()
export class AiImageGenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiImageGenerationWorker.name);
  private worker: Worker<AiImageGenerationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly generationEngine: AiImageGenerationEngine,
    private readonly scoreEngine: ImageQualityScoreEngine,
    private readonly repository: AiImageRepository,
    private readonly eventQueue: AiImageEventQueue,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      const opts: WorkerOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        concurrency: 2, // AI image generation is resource-intensive
      };

      this.worker = new Worker<AiImageGenerationJobPayload>(
        QUEUE_NAMES.AI_IMAGE_GENERATION,
        async (job: Job<AiImageGenerationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Image generation completed for set ${job.data.imageSetId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Image generation failed for ${job?.data.imageSetId}: ${err.message}`),
      );
      this.logger.log('AI Image Generation worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Image Generation worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: AiImageGenerationJobPayload): Promise<void> {
    const { imageSetId, workspaceId, provider, requests, isRegeneration } = payload;

    await this.repository.update(imageSetId, workspaceId, {
      status: AiImageStatus.GENERATING,
      generationStartedAt: new Date(),
      errorMessage: null,
      failedAt: null,
    });

    try {
      const record = await this.repository.findById(imageSetId, workspaceId);
      if (!record) throw new Error(`Image set ${imageSetId} not found`);

      const model = payload.model ?? this.generationEngine.defaultModel(provider);

      const { images, imagesGenerated } = await this.generationEngine.generate(
        provider,
        model,
        requests,
        { productName: '' }, // In production, load from CatalogProduct
        payload.basePrompt,
        payload.negativePrompt,
      );

      // Merge with existing images if regenerating specific types
      const existingImages = (record['images'] as GeneratedImage[]) ?? [];
      const regeneratedTypes = new Set(requests.map((r) => r.imageType));
      const keptImages = isRegeneration
        ? existingImages.filter((img) => !regeneratedTypes.has(img.imageType))
        : [];
      const mergedImages = [...keptImages, ...images];

      const imageQualityScore = this.scoreEngine.calculate({
        images: mergedImages,
        requestedImageTypes: mergedImages.map((i) => i.imageType),
      });

      const nextVersion = (record['version'] as number) + (isRegeneration ? 1 : 0);

      await this.repository.update(imageSetId, workspaceId, {
        status: AiImageStatus.GENERATED,
        images: mergedImages,
        imageQualityScore,
        imagesGenerated,
        model,
        version: nextVersion,
        generationCompletedAt: new Date(),
      });

      const event = isRegeneration ? AiImageEvent.REGENERATED : AiImageEvent.GENERATED;
      const imageTypes = requests.map((r) => r.imageType);

      await this.eventQueue.enqueue({
        imageSetId,
        catalogProductId: payload.catalogProductId,
        workspaceId,
        event,
        imageTypes,
        triggeredBy: payload.triggeredBy,
        metadata: { imageQualityScore, imagesGenerated, model },
      });

      await this.repository.createHistoryEntry({
        imageSetId,
        workspaceId,
        fromStatus: AiImageStatus.GENERATING,
        toStatus: AiImageStatus.GENERATED,
        version: nextVersion,
        imageTypesRegenerated: isRegeneration ? imageTypes : null,
        reason: isRegeneration ? 'Specific images regenerated' : 'Initial image generation completed',
        changedBy: payload.triggeredBy ?? null,
        snapshotImageUrls: mergedImages.map((i) => ({ imageId: i.imageId, url: i.url, imageType: i.imageType })),
      });

      this.logger.log(
        `Image generation completed for ${imageSetId}: score=${imageQualityScore}, count=${imagesGenerated}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Image generation failed for ${imageSetId}: ${errorMessage}`);

      await this.repository.update(imageSetId, workspaceId, {
        status: AiImageStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      });

      await this.repository.createHistoryEntry({
        imageSetId,
        workspaceId,
        fromStatus: AiImageStatus.GENERATING,
        toStatus: AiImageStatus.FAILED,
        version: 0,
        imageTypesRegenerated: null,
        reason: errorMessage,
        changedBy: payload.triggeredBy ?? null,
        snapshotImageUrls: null,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
