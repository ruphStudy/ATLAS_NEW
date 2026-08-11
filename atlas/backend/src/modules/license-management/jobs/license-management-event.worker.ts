import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ILicenseManagementEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.LICENSE_MANAGEMENT_EVENTS)
export class LicenseManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(LicenseManagementEventWorker.name);

  async process(job: Job<ILicenseManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: license ${job.data.licenseId}`);
  }
}
