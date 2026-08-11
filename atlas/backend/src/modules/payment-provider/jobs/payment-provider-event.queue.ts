import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IPaymentProviderEventPayload } from '../interfaces';

@Injectable()
export class PaymentProviderEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.PAYMENT_PROVIDER_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IPaymentProviderEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
