import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { IDashboardEvent } from './interfaces';

@Injectable()
export class DashboardFrameworkEventQueue {
  private readonly logger = new Logger(DashboardFrameworkEventQueue.name);

  constructor(
    @InjectQueue('dashboard-framework-events')
    private readonly queue: Queue,
  ) {}

  async publish(event: IDashboardEvent): Promise<void> {
    try {
      await this.queue.add('dashboard-event', event, {
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.debug(
        `Published dashboard event: ${event.event} for workspace ${event.workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish dashboard event: ${(error as Error).message}`,
      );
    }
  }
}
