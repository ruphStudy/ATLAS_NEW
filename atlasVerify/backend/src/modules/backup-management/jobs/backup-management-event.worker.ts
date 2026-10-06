import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IBackupManagementEventPayload } from '../interfaces';

/**
 * BackupManagementEventWorker
 *
 * Structured logging sink for policy/backup lifecycle events — the same
 * generic event-consumption pattern used by
 * `DisasterRecoveryEventWorker`/`EnterpriseWorkflowEngineEventWorker`.
 * Owning modules that need to react to a specific event attach their
 * own consumer to this queue and filter by job name.
 */
@Processor(QUEUE_NAMES.BACKUP_MANAGEMENT_EVENTS)
export class BackupManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(BackupManagementEventWorker.name);

  async process(job: Job<IBackupManagementEventPayload>): Promise<void> {
    this.logger.log(`${job.name}: ${JSON.stringify({ jobId: job.data.jobId, policyId: job.data.policyId, status: job.data.status })}`);
  }
}
