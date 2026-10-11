import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { SUPPLIER_DISCOVERY_CONSTANTS } from '../constants';

export interface SupplierDiscoveryJobData {
  sessionId: string;
  workspaceId: string;
}

@Injectable()
export class SupplierDiscoveryQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupplierDiscoveryQueue.name);
  private queue: Queue<SupplierDiscoveryJobData> | null = null;

  constructor(private readonly configService: ConfigurationService) {}

  onModuleInit(): void {
    const { host, port, password, tls } = this.configService.getRedisConfig();
    try {
      this.queue = new Queue<SupplierDiscoveryJobData>(
        SUPPLIER_DISCOVERY_CONSTANTS.QUEUE_NAME,
        {
          connection: { host, port, password, maxRetriesPerRequest: null, tls: tls ? {} : undefined },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: { count: 1_000 },
            removeOnFail: { count: 500 },
          },
        },
      );
      this.logger.log('Supplier discovery queue initialized');
    } catch (err) {
      this.logger.warn(`Supplier discovery queue unavailable: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queue?.close();
    } catch { /* ignore */ }
  }

  async enqueue(data: SupplierDiscoveryJobData): Promise<string | null> {
    if (!this.queue) {
      this.logger.warn('Supplier discovery queue unavailable – job skipped');
      return null;
    }
    const job = await this.queue.add(SUPPLIER_DISCOVERY_CONSTANTS.JOB_NAME, data, {
      jobId: `supplier-discovery-${data.sessionId}`, // idempotent per session (BullMQ custom IDs cannot contain ':')
    });
    return job.id ?? null;
  }

  getQueue(): Queue<SupplierDiscoveryJobData> | null {
    return this.queue;
  }
}
