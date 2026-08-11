import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { FeatureFlagCacheService } from '../feature-flag-cache.service';
import { FeatureFlagEvent, IFeatureFlagEventPayload } from '../interfaces';

/** Event-driven cache invalidation — every lifecycle event except pure evaluation telemetry invalidates the resolved-flag cache for that key, since any definition/override write can change the resolved outcome for any context. */
@Processor(QUEUE_NAMES.FEATURE_FLAGS_EVENTS)
export class FeatureFlagsEventWorker extends WorkerHost {
  private readonly logger = new Logger(FeatureFlagsEventWorker.name);

  constructor(private readonly cache: FeatureFlagCacheService) {
    super();
  }

  async process(job: Job<IFeatureFlagEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: flag ${job.data.flagKey}`);

    if (job.data.event !== FeatureFlagEvent.FLAG_EVALUATED) {
      this.cache.invalidateFlag(job.data.flagKey);
    }
  }
}
