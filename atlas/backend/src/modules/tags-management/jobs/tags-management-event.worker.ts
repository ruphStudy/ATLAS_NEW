import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ITagsManagementEventPayload } from '../interfaces';

/**
 * TagsManagementEventWorker — logs lifecycle events. Owning modules can
 * attach their own consumer to this same queue and filter on
 * `entityType`/`entityId`, the same generic event-stream contract used by
 * Task Management, Approval Workflow and Notes & Comments.
 */
@Processor(QUEUE_NAMES.TAGS_MANAGEMENT_EVENTS)
export class TagsManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(TagsManagementEventWorker.name);

  async process(job: Job<ITagsManagementEventPayload>): Promise<void> {
    const { event, workspaceId, tagId } = job.data;
    this.logger.debug(`${event}: tag ${tagId ?? 'n/a'} for workspace ${workspaceId ?? 'n/a'}`);
  }
}
