import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import {
  OptimizedContent,
  SeoEvent,
  SeoOptimizationJobPayload,
  SeoStatus,
} from '../interfaces';
import { SeoOptimizationEngine } from '../engine/seo-optimization.engine';
import { SeoAnalysisEngine } from '../engine/seo-analysis.engine';
import { AiSeoRepository } from '../ai-seo.repository';
import { SeoEventQueue } from './seo-event.queue';
import { AI_SEO_CONSTANTS } from '../constants';

@Injectable()
export class SeoOptimizationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SeoOptimizationWorker.name);
  private worker: Worker<SeoOptimizationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly optimizationEngine: SeoOptimizationEngine,
    private readonly analysisEngine: SeoAnalysisEngine,
    private readonly repository: AiSeoRepository,
    private readonly eventQueue: SeoEventQueue,
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
        concurrency: 3,
      };

      this.worker = new Worker<SeoOptimizationJobPayload>(
        QUEUE_NAMES.AI_SEO_OPTIMIZATION,
        async (job: Job<SeoOptimizationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`SEO optimization completed for ${job.data.seoId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`SEO optimization failed for ${job?.data.seoId}: ${err.message}`),
      );
      this.logger.log('SEO Optimization worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize SEO Optimization worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: SeoOptimizationJobPayload): Promise<void> {
    const { seoId, workspaceId, provider, sections, isRegeneration } = payload;

    await this.repository.update(seoId, workspaceId, {
      status: SeoStatus.ANALYZING,
      optimizationStartedAt: new Date(),
      errorMessage: null,
      failedAt: null,
    });

    try {
      const record = await this.repository.findById(seoId, workspaceId);
      if (!record) throw new Error(`SEO record ${seoId} not found`);

      const model = payload.model ?? this.optimizationEngine.defaultModel(provider);
      const targetKeywords = payload.targetKeywords ?? [];

      const { optimizedContent, tokensUsed } = await this.optimizationEngine.optimize(
        provider,
        model,
        sections,
        { productName: '', marketplace: payload.marketplace },
        targetKeywords,
      );

      // Merge with existing content when regenerating sections
      const existingContent = (record['optimizedContent'] as OptimizedContent) ?? {};
      const mergedContent: OptimizedContent = isRegeneration
        ? { ...existingContent, ...optimizedContent }
        : optimizedContent;

      const analysis = this.analysisEngine.analyze(mergedContent, targetKeywords, sections);
      const nextVersion = (record['version'] as number) + (isRegeneration ? 1 : 0);

      await this.repository.update(seoId, workspaceId, {
        status: SeoStatus.OPTIMIZED,
        optimizedContent: mergedContent,
        analysis,
        seoScore: analysis.seoScore,
        tokensUsed,
        model,
        version: nextVersion,
        optimizationCompletedAt: new Date(),
      });

      await this.eventQueue.enqueue({
        seoId,
        catalogProductId: payload.catalogProductId,
        workspaceId,
        event: SeoEvent.OPTIMIZED,
        triggeredBy: payload.triggeredBy,
        metadata: { seoScore: analysis.seoScore, tokensUsed, model },
      });

      await this.repository.createHistoryEntry({
        seoId,
        workspaceId,
        fromStatus: SeoStatus.ANALYZING,
        toStatus: SeoStatus.OPTIMIZED,
        version: nextVersion,
        sectionsOptimized: sections,
        reason: isRegeneration ? 'Sections re-optimized' : 'Initial SEO optimization completed',
        changedBy: payload.triggeredBy ?? null,
        snapshotContent: mergedContent,
      });

      this.logger.log(
        `SEO optimization completed for ${seoId}: score=${analysis.seoScore}, tokens=${tokensUsed}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SEO optimization failed for ${seoId}: ${errorMessage}`);

      await this.repository.update(seoId, workspaceId, {
        status: SeoStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
      });

      await this.repository.createHistoryEntry({
        seoId,
        workspaceId,
        fromStatus: SeoStatus.ANALYZING,
        toStatus: SeoStatus.FAILED,
        version: 0,
        sectionsOptimized: null,
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
