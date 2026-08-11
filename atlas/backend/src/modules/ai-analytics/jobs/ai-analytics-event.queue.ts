import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IAiAnalyticsEvent } from '../interfaces';

@Injectable()
export class AiAnalyticsEventQueue {
  constructor(
    @InjectQueue('ai-analytics-events')
    private readonly queue: Queue<IAiAnalyticsEvent>,
  ) {}

  async publish(event: IAiAnalyticsEvent): Promise<void> {
    await this.queue.add(event.event, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
  }
}
