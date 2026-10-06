import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { IKpiEvent } from '../interfaces';

@Injectable()
export class KpiManagementEventQueue {
  private readonly logger = new Logger(KpiManagementEventQueue.name);

  constructor(
    @InjectQueue('kpi-management-events') private readonly queue: Queue,
  ) {}

  async publish(event: IKpiEvent): Promise<void> {
    try {
      await this.queue.add('kpi-management-event', event, {
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.debug(
        `Published event: ${event.event} for workspace ${event.workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event: ${event.event}`,
        (error as Error).stack,
      );
    }
  }
}
