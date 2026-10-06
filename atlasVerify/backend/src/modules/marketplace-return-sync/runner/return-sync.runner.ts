import { Injectable, Logger } from '@nestjs/common';
import {
  IReturnSyncJob,
  ReturnSyncAdapter,
  ReturnSyncEvent,
  SyncDirection,
  SyncJobStatus,
} from '../interfaces';
import { ReturnSyncRepository } from '../repository/return-sync.repository';
import { ReturnSyncStateManager } from '../state/return-sync-state.manager';
import { ReturnSyncEventQueue } from '../events/return-sync-events.queue';
import { ReturnPuller } from '../puller/return-puller';
import { ReturnPusher } from '../pusher/return-pusher';
import { MP_RETURN_SYNC_ERROR_CODES } from '../constants';

export interface ReturnRunnerContext {
  job: IReturnSyncJob;
  adapter: ReturnSyncAdapter;
}

@Injectable()
export class ReturnSyncRunner {
  private readonly logger = new Logger(ReturnSyncRunner.name);

  constructor(
    private readonly repository: ReturnSyncRepository,
    private readonly stateManager: ReturnSyncStateManager,
    private readonly eventQueue: ReturnSyncEventQueue,
    private readonly puller: ReturnPuller,
    private readonly pusher: ReturnPusher,
  ) {}

  async run(ctx: ReturnRunnerContext): Promise<void> {
    const { job } = ctx;

    try {
      if (job.direction === SyncDirection.INBOUND || job.direction === SyncDirection.BIDIRECTIONAL) {
        await this.puller.run(job, ctx.adapter);
      }

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

  private async finish(job: IReturnSyncJob, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorCode'] = MP_RETURN_SYNC_ERROR_CODES.ADAPTER_ERROR;
      data['errorMessage'] = errorMessage.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
    }
    await this.repository.updateJob(job.id, job.workspaceId, data);

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    const eventName =
      status === SyncJobStatus.COMPLETED ? ReturnSyncEvent.COMPLETED :
      status === SyncJobStatus.PARTIAL   ? ReturnSyncEvent.PARTIAL :
      status === SyncJobStatus.CANCELLED ? ReturnSyncEvent.CANCELLED :
                                           ReturnSyncEvent.FAILED;

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
