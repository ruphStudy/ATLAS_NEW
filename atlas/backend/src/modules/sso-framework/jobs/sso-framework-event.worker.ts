import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISsoFrameworkEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.SSO_FRAMEWORK_EVENTS)
export class SsoFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(SsoFrameworkEventWorker.name);

  async process(job: Job<ISsoFrameworkEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: connection ${job.data.connectionId}`);
  }
}
