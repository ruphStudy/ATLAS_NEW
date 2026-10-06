import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IComplianceFrameworkEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.COMPLIANCE_FRAMEWORK_EVENTS)
export class ComplianceFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(ComplianceFrameworkEventWorker.name);

  async process(job: Job<IComplianceFrameworkEventPayload>): Promise<void> {
    const { event, workspaceId, recordId, ruleId } = job.data;
    this.logger.debug(`${event}: rule ${ruleId ?? '-'} record ${recordId ?? '-'} for workspace ${workspaceId}`);
  }
}
