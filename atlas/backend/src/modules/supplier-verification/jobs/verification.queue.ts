import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { VERIFICATION_CONSTANTS } from '../constants';

export interface VerificationJobData {
  verificationId: string;
  supplierId: string;
  workspaceId: string;
}

@Injectable()
export class VerificationQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VerificationQueue.name);
  private queue: Queue<VerificationJobData> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    const { host, port, password, tls } = this.configService.getRedisConfig();
    try {
      this.queue = new Queue<VerificationJobData>(VERIFICATION_CONSTANTS.QUEUE_NAME, {
        connection: { host, port, password, maxRetriesPerRequest: null, tls: tls ? {} : undefined },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { count: 1_000 },
          removeOnFail: { count: 500 },
        },
      });
      this.logger.log('Verification queue initialized');
    } catch (err) {
      this.logger.warn(`Verification queue unavailable: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try { await this.queue?.close(); } catch { /* ignore */ }
  }

  async enqueue(data: VerificationJobData): Promise<string | null> {
    if (!this.queue) {
      this.logger.warn('Verification queue unavailable – job skipped');
      return null;
    }
    const job = await this.queue.add(VERIFICATION_CONSTANTS.JOB_NAME, data, {
      jobId: `verification:${data.verificationId}`,
    });
    return job.id ?? null;
  }

  getQueue(): Queue<VerificationJobData> | null {
    return this.queue;
  }
}
