import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { CompetitionAnalysisJobPayload } from '../interfaces';
import { COMPETITION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class CompetitionAnalysisQueue implements OnModuleDestroy {
  private readonly logger = new Logger(CompetitionAnalysisQueue.name);
  private queue: Queue<CompetitionAnalysisJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      const queueOptions: QueueOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: COMPETITION_QUEUE_CONFIG.ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: COMPETITION_QUEUE_CONFIG.BACKOFF_DELAY_MS,
          },
          removeOnComplete: COMPETITION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: COMPETITION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };

      this.queue = new Queue<CompetitionAnalysisJobPayload>(
        QUEUE_NAMES.COMPETITION_ANALYSIS,
        queueOptions,
      );

      this.logger.log('Competition Analysis queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize queue: ${error instanceof Error ? error.message : 'Unknown error'}. Queue operations will be skipped.`,
      );
      this.queue = null;
    }
  }

  async addJob(payload: CompetitionAnalysisJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Queue not available. Analysis must be triggered manually.');
      return;
    }

    try {
      await this.queue.add('analyze-competition', payload, {
        jobId: `competition-${payload.analysisId}`,
        removeOnComplete: true,
      });
      this.logger.log(`Queued competition analysis job: ${payload.analysisId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getJobStatus(analysisId: string): Promise<string | null> {
    if (!this.queue) return null;
    try {
      const job = await this.queue.getJob(`competition-${analysisId}`);
      return job ? await job.getState() : null;
    } catch {
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Competition Analysis queue closed');
    }
  }
}
