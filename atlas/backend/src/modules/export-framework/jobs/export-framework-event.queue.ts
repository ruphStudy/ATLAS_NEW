import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IExportEventPayload } from '../interfaces';

@Injectable()
export class ExportFrameworkEventQueue {
  private readonly logger = new Logger(ExportFrameworkEventQueue.name);

  constructor(
    @InjectQueue('export-framework-events') private readonly queue: Queue,
  ) {}

  async publish(payload: IExportEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.debug(`Published event: ${payload.event}`, {
        workspaceId: payload.workspaceId,
        exportRequestId: payload.exportRequestId,
        exportExecutionId: payload.exportExecutionId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
