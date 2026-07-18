import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  AiDescriptionEvent,
  AiDescriptionStatus,
  AiGenerationJobPayload,
  GeneratedContent,
} from '../interfaces';
import { AiGenerationEngine } from '../engine/ai-generation.engine';
import { AiQualityScoreEngine } from '../engine/ai-quality-score.engine';
import { AiDescriptionRepository } from '../ai-description.repository';
import { AiDescriptionEventQueue } from './ai-description-event.queue';
import { AI_DESCRIPTION_CONSTANTS } from '../constants';

@Injectable()
export class AiGenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiGenerationWorker.name);
  private worker: Worker<AiGenerationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly generationEngine: AiGenerationEngine,
    private readonly scoreEngine: AiQualityScoreEngine,
    private readonly repository: AiDescriptionRepository,
    private readonly eventQueue: AiDescriptionEventQueue,
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
        concurrency: 3, // Limit concurrent AI calls
      };

      this.worker = new Worker<AiGenerationJobPayload>(
        QUEUE_NAMES.AI_DESCRIPTION_GENERATION,
        async (job: Job<AiGenerationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`AI generation completed for description ${job.data.descriptionId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`AI generation failed for ${job?.data.descriptionId}: ${err.message}`),
      );
      this.logger.log('AI Generation worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AI Generation worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: AiGenerationJobPayload): Promise<void> {
    const { descriptionId, workspaceId, provider, tone, language, sections, isRegeneration } = payload;

    // Mark as GENERATING
    await this.repository.update(descriptionId, workspaceId, {
      status: AiDescriptionStatus.GENERATING,
      generationStartedAt: new Date(),
      errorMessage: null,
      failedAt: null,
    });

    try {
      const record = await this.repository.findById(descriptionId, workspaceId);
      if (!record) {
        throw new Error(`Description record ${descriptionId} not found`);
      }

      const model = (payload.model ?? this.defaultModel(provider)) as string;

      const { content, tokensUsed } = await this.generationEngine.generate(provider, model, {
        context: {
          productName: '', // In production, load from CatalogProduct
          brand: undefined,
          category: undefined,
          description: undefined,
          specifications: [],
          attributes: [],
          variants: [],
        },
        tone,
        language,
        sections,
      });

      // Merge with existing content if regenerating partial sections
      const existingContent = (record['content'] as GeneratedContent) ?? {};
      const mergedContent: GeneratedContent = { ...existingContent, ...content };

      const aiQualityScore = this.scoreEngine.calculate({
        content: mergedContent,
        requestedSections: sections,
      });

      const nextVersion = (record['version'] as number) + (isRegeneration ? 1 : 0);

      await this.repository.update(descriptionId, workspaceId, {
        status: AiDescriptionStatus.GENERATED,
        content: mergedContent,
        aiQualityScore,
        tokensUsed,
        model,
        version: nextVersion,
        generationCompletedAt: new Date(),
      });

      const event = isRegeneration ? AiDescriptionEvent.REGENERATED : AiDescriptionEvent.GENERATED;

      await this.eventQueue.enqueue({
        descriptionId,
        catalogProductId: payload.catalogProductId,
        workspaceId,
        event,
        sections,
        triggeredBy: payload.triggeredBy,
        metadata: { aiQualityScore, tokensUsed, model },
      });

      await this.repository.createHistoryEntry({
        descriptionId,
        workspaceId,
        fromStatus: AiDescriptionStatus.GENERATING,
        toStatus: AiDescriptionStatus.GENERATED,
        version: nextVersion,
        sectionsRegenerated: isRegeneration ? sections : null,
        reason: isRegeneration ? 'Sections regenerated' : 'Initial generation completed',
        changedBy: payload.triggeredBy ?? null,
        snapshotContent: mergedContent,
      });

      this.logger.log(
        `AI generation completed for ${descriptionId}: score=${aiQualityScore}, tokens=${tokensUsed}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI generation failed for ${descriptionId}: ${errorMessage}`);

      await this.repository.update(descriptionId, workspaceId, {
        status: AiDescriptionStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      });

      await this.repository.createHistoryEntry({
        descriptionId,
        workspaceId,
        fromStatus: AiDescriptionStatus.GENERATING,
        toStatus: AiDescriptionStatus.FAILED,
        version: 0,
        sectionsRegenerated: null,
        reason: errorMessage,
        changedBy: payload.triggeredBy ?? null,
        snapshotContent: null,
      });
    }
  }

  private defaultModel(provider: string): string {
    return (
      AI_DESCRIPTION_CONSTANTS[`DEFAULT_MODEL_${provider}` as keyof typeof AI_DESCRIPTION_CONSTANTS] as string
    ) ?? 'gpt-4o';
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
