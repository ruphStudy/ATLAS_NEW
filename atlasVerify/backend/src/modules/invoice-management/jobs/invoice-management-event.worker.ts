import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IInvoiceManagementEventPayload } from '../interfaces';

/**
 * Drains the invoice-management-events queue. No in-process cache to
 * invalidate — this worker keeps the queue processed and gives a
 * notification/reporting consumer a place to attach, the same generic
 * event contract used across this session.
 */
@Processor(QUEUE_NAMES.INVOICE_MANAGEMENT_EVENTS)
export class InvoiceManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(InvoiceManagementEventWorker.name);

  async process(job: Job<IInvoiceManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: invoice ${job.data.invoiceNumber} (workspace ${job.data.workspaceId})`);
  }
}
