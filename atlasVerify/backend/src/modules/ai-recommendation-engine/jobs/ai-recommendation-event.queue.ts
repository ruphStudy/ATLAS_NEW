import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IRecommendationEventPayload } from '../interfaces';

@Injectable()
export class AiRecommendationEventQueue {
  constructor(
    @InjectQueue('ai-recommendation-events')
    private readonly queue: Queue,
  ) {}

  async publish(payload: IRecommendationEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
