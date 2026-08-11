import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/constants';
import { PriceSyncJobPayload } from '../queue/price-sync.queue';
import { MarketplacePricingSyncService } from '../marketplace-pricing-sync.service';

@Processor(QUEUE_NAMES.MARKETPLACE_PRICING_SYNC_JOBS)
export class PriceSyncWorker extends WorkerHost {
  private readonly logger = new Logger(PriceSyncWorker.name);

  constructor(private readonly service: MarketplacePricingSyncService) {
    super();
  }

  async process(job: Job<PriceSyncJobPayload>): Promise<void> {
    this.logger.log(`Processing price sync job: ${job.data.jobId} [${job.data.providerKey}/${job.data.marketplaceKey}]`);
  }
}
