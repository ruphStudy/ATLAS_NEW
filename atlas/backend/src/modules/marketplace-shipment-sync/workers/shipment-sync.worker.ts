import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/constants';
import { ShipmentSyncJobPayload } from '../queue/shipment-sync.queue';
import { MarketplaceShipmentSyncService } from '../marketplace-shipment-sync.service';

@Processor(QUEUE_NAMES.MARKETPLACE_SHIPMENT_SYNC_JOBS)
export class ShipmentSyncWorker extends WorkerHost {
  private readonly logger = new Logger(ShipmentSyncWorker.name);

  constructor(private readonly service: MarketplaceShipmentSyncService) {
    super();
  }

  async process(job: Job<ShipmentSyncJobPayload>): Promise<void> {
    this.logger.log(`Processing shipment sync job: ${job.data.jobId} [${job.data.providerKey}/${job.data.marketplaceKey}]`);
  }
}
