import { Injectable, Logger } from '@nestjs/common';
import {
  IShipmentSyncJob,
  ShipmentSyncAdapter,
  ShipmentSyncEvent,
  SyncDirection,
  SyncJobStatus,
} from '../interfaces';
import { ShipmentSyncRepository } from '../repository/shipment-sync.repository';
import { ShipmentSyncStateManager } from '../state/shipment-sync-state.manager';
import { ShipmentSyncEventQueue } from '../events/shipment-sync-events.queue';
import { ShipmentPuller } from '../puller/shipment-puller';
import { ShipmentPusher } from '../pusher/shipment-pusher';
import { MP_SHIPMENT_SYNC_ERROR_CODES } from '../constants';

export interface ShipmentRunnerContext {
  job: IShipmentSyncJob;
  adapter: ShipmentSyncAdapter;
}

@Injectable()
export class ShipmentSyncRunner {
  private readonly logger = new Logger(ShipmentSyncRunner.name);

  constructor(
    private readonly repository: ShipmentSyncRepository,
    private readonly stateManager: ShipmentSyncStateManager,
    private readonly eventQueue: ShipmentSyncEventQueue,
    private readonly puller: ShipmentPuller,
    private readonly pusher: ShipmentPusher,
  ) {}

  async run(ctx: ShipmentRunnerContext): Promise<void> {
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

  private async finish(job: IShipmentSyncJob, status: SyncJobStatus, errorMessage?: string): Promise<void> {
    const data: Record<string, unknown> = { status, completedAt: new Date() };
    if (errorMessage) {
      data['errorCode'] = MP_SHIPMENT_SYNC_ERROR_CODES.ADAPTER_ERROR;
      data['errorMessage'] = errorMessage.replace(/(secret|token|password|key|credential)=[^\s&]*/gi, '$1=***').substring(0, 500);
    }
    await this.repository.updateJob(job.id, job.workspaceId, data);

    const fresh = await this.repository.findJobById(job.id, job.workspaceId);
    const eventName =
      status === SyncJobStatus.COMPLETED ? ShipmentSyncEvent.COMPLETED :
      status === SyncJobStatus.PARTIAL   ? ShipmentSyncEvent.PARTIAL :
      status === SyncJobStatus.CANCELLED ? ShipmentSyncEvent.CANCELLED :
                                           ShipmentSyncEvent.FAILED;

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
