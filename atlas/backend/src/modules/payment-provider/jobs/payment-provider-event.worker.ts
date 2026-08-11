import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IPaymentProviderEventPayload } from '../interfaces';

/**
 * Drains the payment-provider-events queue. Keeps the queue processed and
 * gives Billing Engine / Invoice Management a place to attach their own
 * consumer (e.g. to react to TRANSACTION_SUCCEEDED by calling
 * `BillingEngineService.recordPayment`) — the same generic event contract
 * used across this session.
 */
@Processor(QUEUE_NAMES.PAYMENT_PROVIDER_EVENTS)
export class PaymentProviderEventWorker extends WorkerHost {
  private readonly logger = new Logger(PaymentProviderEventWorker.name);

  async process(job: Job<IPaymentProviderEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: provider ${job.data.providerKey} (workspace ${job.data.workspaceId})`);
  }
}
