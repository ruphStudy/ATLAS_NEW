import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface AiModelEventPayload {
  event: string;
  workspaceId?: string;
  modelId?: string;
  configurationId?: string;
  provider?: string;
  modelKey?: string;
  capability?: string;
  [key: string]: unknown;
}

@Injectable()
export class AiModelEventQueue {
  private readonly logger = new Logger(AiModelEventQueue.name);

  constructor(
    @InjectQueue('ai-model-events') private readonly queue: Queue,
  ) {}

  async publish(payload: AiModelEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload, {
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      this.logger.debug(`Published AI model event: ${payload.event}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish AI model event ${payload.event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
