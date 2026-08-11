import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { PlanCacheService } from '../plan-cache.service';
import { IPlanManagementEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.PLAN_MANAGEMENT_EVENTS)
export class PlanManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(PlanManagementEventWorker.name);

  constructor(private readonly cache: PlanCacheService) {
    super();
  }

  async process(job: Job<IPlanManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: plan ${job.data.code} v${job.data.version}`);
    this.cache.invalidateCode(job.data.code);
  }
}
