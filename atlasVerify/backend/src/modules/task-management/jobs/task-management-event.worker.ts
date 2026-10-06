import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ITaskManagementEventPayload } from '../interfaces';

/**
 * TaskManagementEventWorker — logs lifecycle events. Owning modules that
 * create tasks (workflow-generated, approval-generated, AI-generated) can
 * attach their own consumer to this same queue and filter on
 * `module`/`entityType`/`entityId`, the same generic "resume" contract used
 * by Approval Workflow's event stream.
 */
@Processor(QUEUE_NAMES.TASK_MANAGEMENT_EVENTS)
export class TaskManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(TaskManagementEventWorker.name);

  async process(job: Job<ITaskManagementEventPayload>): Promise<void> {
    const { event, workspaceId, taskId, module, status } = job.data;
    this.logger.debug(
      `${event}: task ${taskId ?? 'n/a'} (module ${module ?? 'n/a'}, status ${status ?? 'n/a'}) for workspace ${workspaceId}`,
    );
  }
}
