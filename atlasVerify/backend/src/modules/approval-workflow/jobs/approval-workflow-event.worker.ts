import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IApprovalWorkflowEventPayload } from '../interfaces';

/**
 * ApprovalWorkflowEventWorker — logs lifecycle events. This is also the
 * generic "resume owning-module workflows" contract: any owning module can
 * attach its own consumer to this same queue and react by filtering on
 * `module`/`entityType`/`entityId` in the payload, without this engine ever
 * needing to know about that module's business logic.
 */
@Processor(QUEUE_NAMES.APPROVAL_WORKFLOW_EVENTS)
export class ApprovalWorkflowEventWorker extends WorkerHost {
  private readonly logger = new Logger(ApprovalWorkflowEventWorker.name);

  async process(job: Job<IApprovalWorkflowEventPayload>): Promise<void> {
    const { event, workspaceId, requestId, module, status } = job.data;
    this.logger.debug(
      `${event}: request ${requestId ?? 'n/a'} (module ${module ?? 'n/a'}, status ${status ?? 'n/a'}) for workspace ${workspaceId}`,
    );
  }
}
