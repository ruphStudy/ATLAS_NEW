import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { CompetitionAnalysisService } from '../competition-analysis.service';
import { CompetitionAnalysisJobPayload } from '../interfaces';
import { COMPETITION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class CompetitionAnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompetitionAnalysisWorker.name);
  private worker: Worker<CompetitionAnalysisJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly analysisService: CompetitionAnalysisService,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      this.worker = new Worker<CompetitionAnalysisJobPayload>(
        QUEUE_NAMES.COMPETITION_ANALYSIS,
        async (job: Job<CompetitionAnalysisJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
          },
          concurrency: COMPETITION_QUEUE_CONFIG.CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('Competition Analysis worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(
    job: Job<CompetitionAnalysisJobPayload>,
  ): Promise<void> {
    const { analysisId, workspaceId } = job.data;
    this.logger.log(`Processing competition analysis job: ${analysisId}`);

    try {
      await this.analysisService.executeAnalysis(analysisId, workspaceId);
    } catch (error) {
      this.logger.error(
        `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Competition Analysis worker closed');
    }
  }
}
