import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IPluginFrameworkEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.PLUGIN_FRAMEWORK_EVENTS)
export class PluginFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(PluginFrameworkEventWorker.name);

  async process(job: Job<IPluginFrameworkEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: app ${job.data.appKey}`);
  }
}
