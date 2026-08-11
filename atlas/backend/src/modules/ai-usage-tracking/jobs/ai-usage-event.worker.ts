import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAiUsageEventPayload, AiUsageEvent } from '../interfaces';

@Processor(QUEUE_NAMES.AI_USAGE_EVENTS)
export class AiUsageEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiUsageEventWorker.name);

  async process(job: Job<IAiUsageEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    this.logger.log(
      `Processing AI Usage event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiUsageEvent.QUOTA_CREATED:
      case AiUsageEvent.QUOTA_UPDATED:
      case AiUsageEvent.QUOTA_DELETED:
        this.logger.debug(`Quota event: ${event} (${job.data.quotaId})`);
        break;
      case AiUsageEvent.USAGE_RECORDED:
        this.logger.debug(
          `Usage recorded: ${job.data.usageRecordId} amount=${job.data.amount}`,
        );
        break;
      case AiUsageEvent.QUOTA_THRESHOLD:
        this.logger.log(
          `Quota threshold reached: ${job.data.quotaId} usage=${job.data.amount}`,
        );
        break;
      case AiUsageEvent.QUOTA_WARNING:
        this.logger.warn(
          `Quota warning: ${job.data.quotaId} usage=${job.data.amount}`,
        );
        break;
      case AiUsageEvent.QUOTA_EXCEEDED:
        this.logger.warn(
          `Quota exceeded: ${job.data.quotaId} usage=${job.data.amount}`,
        );
        break;
      case AiUsageEvent.RECONCILIATION_COMPLETED:
        this.logger.log(
          `Reconciliation completed for workspace ${workspaceId}: ${JSON.stringify(job.data.metadata)}`,
        );
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
