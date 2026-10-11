import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { DISCOVERY_CONSTANTS } from '../constants';

export interface DiscoveryJobData {
  sessionId: string;
  workspaceId: string;
}

/**
 * DiscoveryQueue
 *
 * Wraps a BullMQ Queue for async discovery job dispatch.
 * Uses the shared Redis connection from ConfigurationService.
 *
 * Gracefully degrades when Redis is unavailable (e.g. in unit tests
 * or during development without Docker). Jobs will not be enqueued
 * but discovery sessions are still created.
 */
@Injectable()
export class DiscoveryQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscoveryQueue.name);
  private queue: Queue<DiscoveryJobData> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    const { host, port, password, tls } = this.configService.getRedisConfig();

    try {
      this.queue = new Queue<DiscoveryJobData>(DISCOVERY_CONSTANTS.QUEUE_NAME, {
        connection: { host, port, password, maxRetriesPerRequest: null, tls: tls ? {} : undefined },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { count: 1_000 },
          removeOnFail: { count: 500 },
        },
      });
      this.logger.log('Discovery queue initialized');
    } catch (err) {
      this.logger.warn(
        `Discovery queue unavailable (Redis not reachable): ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queue?.close();
    } catch {
      // ignore cleanup errors
    }
  }

  async enqueue(data: DiscoveryJobData): Promise<string | null> {
    if (!this.queue) {
      this.logger.warn('Discovery queue unavailable – job skipped');
      return null;
    }

    const job = await this.queue.add(DISCOVERY_CONSTANTS.JOB_NAME, data, {
      jobId: `discovery-${data.sessionId}`, // idempotent per session (BullMQ custom IDs cannot contain ':')
    });

    return job.id ?? null;
  }

  getQueue(): Queue<DiscoveryJobData> | null {
    return this.queue;
  }
}
