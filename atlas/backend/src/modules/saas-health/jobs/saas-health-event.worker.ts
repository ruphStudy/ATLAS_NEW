import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISaasHealthAggregateEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.SAAS_HEALTH_EVENTS)
export class SaasHealthEventWorker extends WorkerHost {
  private readonly logger = new Logger(SaasHealthEventWorker.name);

  async process(job: Job<ISaasHealthAggregateEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: workspace ${job.data.workspaceId} level ${job.data.level}`);
  }
}
