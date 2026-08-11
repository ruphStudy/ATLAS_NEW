import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/constants';
import { ReturnSyncJobPayload } from '../queue/return-sync.queue';
import { MarketplaceReturnSyncService } from '../marketplace-return-sync.service';

@Processor(QUEUE_NAMES.MARKETPLACE_RETURN_SYNC_JOBS)
export class ReturnSyncWorker extends WorkerHost {
  private readonly logger = new Logger(ReturnSyncWorker.name);

  constructor(private readonly service: MarketplaceReturnSyncService) {
    super();
  }

  async process(job: Job<ReturnSyncJobPayload>): Promise<void> {
    this.logger.log(`Processing return sync job: ${job.data.jobId} [${job.data.providerKey}/${job.data.marketplaceKey}]`);
  }
}
