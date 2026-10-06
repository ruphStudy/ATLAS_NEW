import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IActivityEventPayload, ActivityEvent } from '../interfaces';

@Processor(QUEUE_NAMES.ACTIVITY_EVENTS)
export class ActivityEventWorker extends WorkerHost {
  private readonly logger = new Logger(ActivityEventWorker.name);

  async process(job: Job<IActivityEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    this.logger.log(`Processing activity-center event: ${event} for workspace ${workspaceId}`);

    switch (event) {
      case ActivityEvent.ACTIVITY_RECORDED:
        this.logger.debug(`Activity recorded: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_READ:
        this.logger.debug(`Activity read: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_ALL_READ:
        this.logger.debug(
          `All activities read for recipient ${job.data.recipientUserId}: ${JSON.stringify(job.data.metadata)}`,
        );
        break;
      case ActivityEvent.ACTIVITY_PINNED:
        this.logger.debug(`Activity pinned: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_UNPINNED:
        this.logger.debug(`Activity unpinned: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_ARCHIVED:
        this.logger.debug(`Activity archived: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_RESTORED:
        this.logger.debug(`Activity restored: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_DISMISSED:
        this.logger.debug(`Activity dismissed: ${job.data.activityId}`);
        break;
      case ActivityEvent.ACTIVITY_DELETED:
        this.logger.debug(`Activity deleted: ${job.data.activityId}`);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
