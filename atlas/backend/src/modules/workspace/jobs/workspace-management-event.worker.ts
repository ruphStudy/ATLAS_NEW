import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IWorkspaceManagementEventPayload } from '../interfaces';

/**
 * Drains the workspace-management-events queue. No in-process cache to
 * invalidate here (workspace reads always go straight to the database) —
 * this worker exists so other modules can attach their own consumer to the
 * same queue and react to lifecycle/membership/ownership events, the same
 * generic event contract used by every engine built this session.
 */
@Processor(QUEUE_NAMES.WORKSPACE_MANAGEMENT_EVENTS)
export class WorkspaceManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(WorkspaceManagementEventWorker.name);

  async process(job: Job<IWorkspaceManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: workspace ${job.data.workspaceId}`);
  }
}
