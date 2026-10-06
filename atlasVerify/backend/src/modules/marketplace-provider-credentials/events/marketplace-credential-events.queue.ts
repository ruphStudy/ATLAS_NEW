import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { CredentialEventPayload } from '../interfaces';
import { MP_CREDENTIAL_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceCredentialEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceCredentialEventQueue.name);
  private readonly queue: Queue<CredentialEventPayload>;

  constructor() {
    this.queue = new Queue<CredentialEventPayload>(
      QUEUE_NAMES.MARKETPLACE_PROVIDER_CREDENTIAL_EVENTS,
      {
        connection: {
          host: process.env['REDIS_HOST'] ?? 'localhost',
          port: Number(process.env['REDIS_PORT'] ?? 6379),
        },
      },
    );
  }

  async enqueue(payload: CredentialEventPayload): Promise<void> {
    await this.queue.add(
      `${payload.event}-${payload.credentialId}-${Date.now()}`,
      payload,
      {
        attempts: MP_CREDENTIAL_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_CREDENTIAL_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_CREDENTIAL_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_CREDENTIAL_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    );
    this.logger.debug(
      `Enqueued credential event '${payload.event}' for '${payload.providerKey}' in ws '${payload.workspaceId}'`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
