import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/constants';
import { ReportSyncJobPayload } from '../queue/report-sync.queue';
import { MarketplaceReportSyncService } from '../marketplace-report-sync.service';

@Processor(QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_JOBS)
export class ReportSyncWorker extends WorkerHost {
  private readonly logger = new Logger(ReportSyncWorker.name);

  constructor(private readonly service: MarketplaceReportSyncService) {
    super();
  }

  async process(job: Job<ReportSyncJobPayload>): Promise<void> {
    this.logger.log(`Processing report sync job: ${job.data.jobId} [${job.data.providerKey}/${job.data.marketplaceKey}]`);
  }
}
