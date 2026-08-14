import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { RegionalSettingsEventPayload } from '../interfaces';
import { REGIONAL_SETTINGS_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class RegionalSettingsEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(RegionalSettingsEventQueue.name);
  private readonly queue: Queue<RegionalSettingsEventPayload>;

  constructor() {
    this.queue = new Queue<RegionalSettingsEventPayload>(QUEUE_NAMES.REGIONAL_SETTINGS_EVENTS, {
      defaultJobOptions: {
        attempts: REGIONAL_SETTINGS_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: REGIONAL_SETTINGS_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: REGIONAL_SETTINGS_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: REGIONAL_SETTINGS_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: RegionalSettingsEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue regional settings event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
