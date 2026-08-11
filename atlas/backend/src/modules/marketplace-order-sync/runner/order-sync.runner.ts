import { Injectable, Logger } from '@nestjs/common';
import {
  IOrderSyncJob,
  OrderSyncAdapter,
  OrderSyncEvent,
  SyncJobStatus,
} from '../interfaces';
import { OrderSyncRepository } from '../repository/order-sync.repository';
import { OrderSyncStateManager } from '../state/order-sync-state.manager';
import { OrderSyncEventQueue } from '../events/order-sync-events.queue';
import { OrderPuller } from '../puller/order-puller';
import { MP_ORDER_SYNC_ERROR_CODES } from '../constants';

export interface OrderRunnerContext {
  job: IOrderSyncJob;
  adapter: OrderSyncAdapter;
}

@Injectable()
export class OrderSyncRunner {
  private readonly logger = new Logger(OrderSyncRunner.name);

  constructor(
    private readonly repository: OrderSyncRepository,
    private readonly stateManager: OrderSyncStateManager,
    private readonly eventQueue: OrderSyncEventQueue,
    private readonly puller: OrderPuller,
  ) {}

  async run(ctx: OrderRunnerContext): Promise<void> {
    const { job } = ctx;

    try {
      await this.puller.run(job, ctx.adapter);

      const fresh = await this.repository.findJobById(job.id, job.workspaceId);
      const failedItems = (fresh?.['failedItems'] as number) ?? 0;
      const processedItems = (fresh?.['processedItems'] as number) ?? 0;

      const finalStatus =
        failedItems === 0
          ? SyncJobStatus.COMPLETED
          : processedItems === failedItems
            ? SyncJobStatus.FAILED
            : SyncJobStatus.PARTIAL;

      await this.finish(job, finalStatus);
    } catch (err) {
      await this.finish(job, SyncJobStatus.FAILED, (err as Error).message);
    } finally {
      this.stateManager.unlock(job.workspaceId, job.accountId, job.direction);
      this.stateManager.clearCancelledMark(job.id);
    }
  }

  private async finish(job: IOrderSyncJob, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorCode'] = MP_ORDER_SYNC_ERROR_CODES.ADAPTER_ERROR;
      data['errorMessage'] = errorMessage.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
    }
    await this.repository.updateJob(job.id, job.workspaceId, data);

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    const eventName =
      status === SyncJobStatus.COMPLETED ? OrderSyncEvent.COMPLETED :
      status === SyncJobStatus.PARTIAL   ? OrderSyncEvent.PARTIAL :
      status === SyncJobStatus.CANCELLED ? OrderSyncEvent.CANCELLED :
                                           OrderSyncEvent.FAILED;

    await this.eventQueue.enqueue({
      event: eventName,
      jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
      accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
      direction: job.direction, scope: job.scope, itemType: job.itemType,
      status: (fresh?.['status'] as SyncJobStatus) ?? status,
      processedItems: (fresh?.['processedItems'] as number) ?? 0,
      totalItems: (fresh?.['totalItems'] as number) ?? 0,
      failedItems: (fresh?.['failedItems'] as number) ?? 0,
      timestamp: new Date(),
    });
  }
}
