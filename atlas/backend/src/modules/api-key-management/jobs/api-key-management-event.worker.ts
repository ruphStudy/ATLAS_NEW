import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IApiKeyManagementEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.API_KEY_MANAGEMENT_EVENTS)
export class ApiKeyManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(ApiKeyManagementEventWorker.name);

  async process(job: Job<IApiKeyManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: api key ${job.data.apiKeyId}`);
  }
}
