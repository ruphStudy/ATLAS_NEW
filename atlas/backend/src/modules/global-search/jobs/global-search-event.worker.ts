import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IGlobalSearchEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.GLOBAL_SEARCH_EVENTS)
export class GlobalSearchEventWorker extends WorkerHost {
  private readonly logger = new Logger(GlobalSearchEventWorker.name);

  async process(job: Job<IGlobalSearchEventPayload>): Promise<void> {
    const { event, workspaceId, userId } = job.data;
    this.logger.debug(`${event}: workspace ${workspaceId} user ${userId ?? 'n/a'}`);
  }
}
