import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  ListingContent,
  ListingEvent,
  ListingGenerationJobPayload,
  ListingStatus,
} from '../interfaces';
import { ListingBuilderEngine } from '../engine/listing-builder.engine';
import { ListingQualityEngine } from '../engine/listing-quality.engine';
import { ListingRepository } from '../listing.repository';
import { ListingEventQueue } from './listing-event.queue';
import { LISTING_CONSTANTS } from '../constants';

@Injectable()
export class ListingGenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListingGenerationWorker.name);
  private worker: Worker<ListingGenerationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly builderEngine: ListingBuilderEngine,
    private readonly qualityEngine: ListingQualityEngine,
    private readonly repository: ListingRepository,
    private readonly eventQueue: ListingEventQueue,
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
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        concurrency: 3,
      };

      this.worker = new Worker<ListingGenerationJobPayload>(
        QUEUE_NAMES.LISTING_GENERATION,
        async (job: Job<ListingGenerationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Listing generation completed for ${job.data.listingId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Listing generation failed for ${job?.data.listingId}: ${err.message}`),
      );
      this.logger.log('Listing Generation worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Generation worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: ListingGenerationJobPayload): Promise<void> {
    const {
      listingId,
      workspaceId,
      catalogProductId,
      marketplace,
      sections,
      isRegeneration,
    } = payload;

    await this.repository.update(listingId, workspaceId, {
      status: ListingStatus.GENERATING,
      generationStartedAt: new Date(),
      errorMessage: null,
      failedAt: null,
    });

    try {
      const record = await this.repository.findById(listingId, workspaceId);
      if (!record) throw new Error(`Listing ${listingId} not found`);

      // Build source data — in production, fetch real records from respective modules.
      const { content: builtContent } = this.builderEngine.build(
        {
          catalogProduct: null,
          aiDescription: null,
          aiImageSet: null,
          aiSeo: null,
          marketplace,
        },
        sections,
      );

      // Merge with existing content when regenerating
      const existingContent = isRegeneration
        ? ((record['content'] as ListingContent) ?? {})
        : {};

      const mergedContent: ListingContent = { ...existingContent, ...builtContent };

      const validationResult = this.qualityEngine.validate(mergedContent);
      const nextVersion = (record['version'] as number) + (isRegeneration ? 1 : 0);

      await this.repository.update(listingId, workspaceId, {
        status: ListingStatus.GENERATED,
        content: mergedContent,
        qualityScore: validationResult.qualityScore,
        validationResult,
        version: nextVersion,
        generationCompletedAt: new Date(),
      });

      await this.eventQueue.enqueue({
        listingId,
        catalogProductId,
        workspaceId,
        marketplace,
        event: ListingEvent.GENERATED,
        triggeredBy: payload.triggeredBy,
        metadata: { qualityScore: validationResult.qualityScore },
      });

      await this.repository.createHistoryEntry({
        listingId,
        workspaceId,
        fromStatus: ListingStatus.GENERATING,
        toStatus: ListingStatus.GENERATED,
        version: nextVersion,
        sectionsUpdated: sections,
        reason: isRegeneration ? 'Sections regenerated' : 'Initial listing generated',
        changedBy: payload.triggeredBy ?? null,
        snapshotContent: mergedContent,
      });

      this.logger.log(
        `Listing generated for ${listingId}: score=${validationResult.qualityScore}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Listing generation failed for ${listingId}: ${errorMessage}`);

      await this.repository.update(listingId, workspaceId, {
        status: ListingStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      });

      await this.repository.createHistoryEntry({
        listingId,
        workspaceId,
        fromStatus: ListingStatus.GENERATING,
        toStatus: ListingStatus.FAILED,
        version: 0,
        sectionsUpdated: null,
        reason: errorMessage,
        changedBy: payload.triggeredBy ?? null,
        snapshotContent: null,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
