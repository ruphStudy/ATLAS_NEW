import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IDocumentEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.DOCUMENT_EVENTS)
export class DocumentEventWorker extends WorkerHost {
  private readonly logger = new Logger(DocumentEventWorker.name);

  async process(job: Job<IDocumentEventPayload>): Promise<void> {
    const { event, workspaceId, documentId } = job.data;
    this.logger.debug(`${event}: document ${documentId} for workspace ${workspaceId}`);
  }
}
