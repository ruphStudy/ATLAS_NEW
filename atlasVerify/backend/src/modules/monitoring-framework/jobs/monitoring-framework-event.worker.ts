import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IMonitoringFrameworkEventPayload } from '../interfaces';

/**
 * MonitoringFrameworkEventWorker
 *
 * Structured logging sink for SLO/alert/incident lifecycle events — the
 * same generic event-consumption pattern used by
 * `DisasterRecoveryEventWorker`/`BackupManagementEventWorker`. Owning
 * modules that need to react to a specific event attach their own
 * consumer to this queue and filter by job name.
 */
@Processor(QUEUE_NAMES.MONITORING_FRAMEWORK_EVENTS)
export class MonitoringFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(MonitoringFrameworkEventWorker.name);

  async process(job: Job<IMonitoringFrameworkEventPayload>): Promise<void> {
    this.logger.log(`${job.name}: ${JSON.stringify({ incidentId: job.data.incidentId, sloId: job.data.sloId, status: job.data.status })}`);
  }
}
