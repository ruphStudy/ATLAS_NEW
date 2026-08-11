import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ConnectionTestEventPayload } from '../interfaces';
import { MP_CONN_TEST_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ConnectionTestEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ConnectionTestEventQueue.name);
  private readonly queue: Queue<ConnectionTestEventPayload>;

  constructor() {
    this.queue = new Queue<ConnectionTestEventPayload>(
      QUEUE_NAMES.MARKETPLACE_CONNECTION_TEST_EVENTS,
      {
        connection: {
          host: process.env['REDIS_HOST'] ?? 'localhost',
          port: Number(process.env['REDIS_PORT'] ?? 6379),
        },
        defaultJobOptions: {
          attempts: MP_CONN_TEST_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: MP_CONN_TEST_QUEUE_CONFIG.BACKOFF_MS },
          removeOnComplete: MP_CONN_TEST_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
          removeOnFail: MP_CONN_TEST_QUEUE_CONFIG.REMOVE_ON_FAIL,
        },
      },
    );
  }

  async enqueue(payload: ConnectionTestEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue connection test event '${payload.event}': ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
