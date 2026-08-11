import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IFileEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.FILE_EVENTS)
export class FileEventWorker extends WorkerHost {
  private readonly logger = new Logger(FileEventWorker.name);

  async process(job: Job<IFileEventPayload>): Promise<void> {
    const { event, workspaceId, fileId } = job.data;
    this.logger.debug(`${event}: file ${fileId ?? job.data.folderId} for workspace ${workspaceId}`);
  }
}
