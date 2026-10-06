import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IOAuthManagementEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.OAUTH_MANAGEMENT_EVENTS)
export class OAuthManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(OAuthManagementEventWorker.name);

  async process(job: Job<IOAuthManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: ${job.data.entityType.toLowerCase()} ${job.data.entityId}`);
  }
}
