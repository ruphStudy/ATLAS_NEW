import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { INotesCommentsEventPayload } from '../interfaces';

/**
 * NotesCommentsEventWorker — logs lifecycle events. Owning modules can
 * attach their own consumer to this same queue and filter on
 * `module`/`entityType`/`entityId`, the same generic event-stream contract
 * used by Task Management and Approval Workflow.
 */
@Processor(QUEUE_NAMES.NOTES_COMMENTS_EVENTS)
export class NotesCommentsEventWorker extends WorkerHost {
  private readonly logger = new Logger(NotesCommentsEventWorker.name);

  async process(job: Job<INotesCommentsEventPayload>): Promise<void> {
    const { event, workspaceId, noteId, module } = job.data;
    this.logger.debug(`${event}: note ${noteId ?? 'n/a'} (module ${module ?? 'n/a'}) for workspace ${workspaceId}`);
  }
}
