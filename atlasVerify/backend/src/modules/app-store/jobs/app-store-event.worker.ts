import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAppStoreEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.APP_STORE_EVENTS)
export class AppStoreEventWorker extends WorkerHost {
  private readonly logger = new Logger(AppStoreEventWorker.name);

  async process(job: Job<IAppStoreEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: app ${job.data.appKey}`);
  }
}
