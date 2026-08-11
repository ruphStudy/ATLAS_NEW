import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { IReportEvent } from '../interfaces';

@Injectable()
export class ReportBuilderEventQueue {
  private readonly logger = new Logger(ReportBuilderEventQueue.name);

  constructor(
    @InjectQueue('report-builder-events') private readonly queue: Queue,
  ) {}

  async publish(event: IReportEvent): Promise<void> {
    try {
      await this.queue.add('report-builder-event', event, {
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
