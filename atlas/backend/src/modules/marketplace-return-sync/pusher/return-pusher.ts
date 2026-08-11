import { Injectable, Logger } from '@nestjs/common';
import {
  IReturnSyncJob,
  ReturnItemSyncResult,
  ReturnItemType,
  ReturnSyncAdapter,
  ReturnSyncEvent,
  SyncItemOperation,
  SyncItemStatus,
} from '../interfaces';
import { ReturnSyncRepository } from '../repository/return-sync.repository';
import { ReturnSyncEventQueue } from '../events/return-sync-events.queue';
import { MP_RETURN_SYNC_ERROR_CODES } from '../constants';

@Injectable()
export class ReturnPusher {
  private readonly logger = new Logger(ReturnPusher.name);

  constructor(
    private readonly repository: ReturnSyncRepository,
    private readonly eventQueue: ReturnSyncEventQueue,
  ) {}

  async pushDecision(
    job: IReturnSyncJob,
    adapter: ReturnSyncAdapter,
    externalReturnId: string,
    decision: 'APPROVE' | 'REJECT',
    reason?: string,
    refundAmount?: number,
  ): Promise<ReturnItemSyncResult> {
    try {
      if (!adapter.pushReturnDecision) {
        return {
          externalId: externalReturnId, itemType: ReturnItemType.FULL, operation: SyncItemOperation.NOOP,
          status: SyncItemStatus.FAILED, errorCode: MP_RETURN_SYNC_ERROR_CODES.ADAPTER_ERROR,
          errorMessage: 'Adapter does not support pushReturnDecision', retryable: false,
        };
      }

      const result = await adapter.pushReturnDecision({
        providerKey: job.providerKey,
        accountId: job.accountId,
        externalReturnId,
        decision,
        reason,
        refundAmount,
      });

      if (!result.success) {
        return {
          externalId: externalReturnId,
          itemType: ReturnItemType.FULL, operation: decision === 'APPROVE' ? SyncItemOperation.APPROVE : SyncItemOperation.REJECT,
          status: SyncItemStatus.FAILED,
          errorCode: result.errorCode ?? MP_RETURN_SYNC_ERROR_CODES.RETURN_DECISION_FAILED,
          errorMessage: result.errorMessage ?? 'Decision push failed',
          retryable: true,
        };
      }

      await this.eventQueue.enqueue({
        event: decision === 'APPROVE' ? ReturnSyncEvent.RETURN_APPROVED : ReturnSyncEvent.RETURN_REJECTED,
        jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        direction: job.direction, scope: job.scope, itemType: job.itemType,
        externalReturnId,
        timestamp: new Date(),
      });

      return {
        externalId: externalReturnId,
        itemType: ReturnItemType.FULL, operation: decision === 'APPROVE' ? SyncItemOperation.APPROVE : SyncItemOperation.REJECT,
        status: SyncItemStatus.SYNCED, retryable: false,
      };
    } catch (err) {
      return {
        externalId: externalReturnId, itemType: ReturnItemType.FULL, operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_RETURN_SYNC_ERROR_CODES.RETURN_DECISION_FAILED,
        errorMessage: (err as Error).message.substring(0, 500),
        retryable: true,
      };
    }
  }
}
