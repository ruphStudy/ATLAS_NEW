import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ConflictStrategy,
  IReturnSyncJob,
  ReturnItemSyncResult,
  ReturnItemType,
  ReturnSyncAdapter,
  ReturnSyncEvent,
  NormalizedReturnItem,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { ReturnSyncRepository } from '../repository/return-sync.repository';
import { ReturnSyncStateManager } from '../state/return-sync-state.manager';
import { ReturnSyncEventQueue } from '../events/return-sync-events.queue';
import { ReturnSyncConflictResolver } from '../conflict/return-sync-conflict.resolver';
import { ReturnMapper } from '../mapper/return-mapper';
import { MP_RETURN_SYNC_CONSTANTS, MP_RETURN_SYNC_ERROR_CODES } from '../constants';

@Injectable()
export class ReturnPuller {
  private readonly logger = new Logger(ReturnPuller.name);

  constructor(
    private readonly repository: ReturnSyncRepository,
    private readonly stateManager: ReturnSyncStateManager,
    private readonly eventQueue: ReturnSyncEventQueue,
    private readonly conflictResolver: ReturnSyncConflictResolver,
    private readonly mapper: ReturnMapper,
  ) {}

  async run(job: IReturnSyncJob, adapter: ReturnSyncAdapter): Promise<void> {
    if (!adapter.fetchReturns) {
      this.logger.warn(`Adapter '${job.providerKey}' does not support fetchReturns — skipping inbound`);
      return;
    }

    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_RETURN_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor });
        await this.eventQueue.enqueue({
          event: ReturnSyncEvent.CANCELLED,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          direction: job.direction, scope: job.scope, itemType: job.itemType,
          timestamp: new Date(),
        });
        return;
      }

      const pageResult = await adapter.fetchReturns({
        providerKey: job.providerKey,
        accountId: job.accountId,
        cursor,
        pageSize: MP_RETURN_SYNC_CONSTANTS.RETURNS_PER_PAGE,
        filterOptions: job.filterOptions,
      });

      if (!pageResult.returns?.length) break;

      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, { totalItems: pageResult.totalCount });
      }

      const counters = { processedItems: 0, importedReturns: 0, updatedReturns: 0, approvedReturns: 0, rejectedReturns: 0, refundedReturns: 0, failedItems: 0, skippedItems: 0, conflictItems: 0 };

      for (const rawReturn of pageResult.returns) {
        const start = Date.now();
        const result = await this.pullReturn(job, adapter, rawReturn as Record<string, unknown>);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id, workspaceId: job.workspaceId,
          externalId: result.externalId, internalId: result.internalId ?? null, rmaNumber: result.rmaNumber ?? null,
          itemType: result.itemType, operation: result.operation, status: result.status,
          errorCode: result.errorCode ?? null, errorMessage: result.errorMessage ?? null,
          retryable: result.retryable, processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) {
          if (result.operation === SyncItemOperation.CREATE) counters.importedReturns++;
          else if (result.operation === SyncItemOperation.UPDATE) counters.updatedReturns++;
          else if (result.operation === SyncItemOperation.APPROVE) counters.approvedReturns++;
          else if (result.operation === SyncItemOperation.REJECT) counters.rejectedReturns++;
          else if (result.operation === SyncItemOperation.REFUND) counters.refundedReturns++;
        }
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else if (result.status === SyncItemStatus.CONFLICT) counters.conflictItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_RETURN_SYNC_CONSTANTS.RETURN_RESULT_FLUSH_SIZE) {
          await this.repository.bulkCreateItemResults([...itemBatch]);
          itemBatch = [];
        }
      }

      await this.repository.incrementJobCounters(job.id, counters);

      cursor = pageResult.nextCursor ?? null;
      if (!cursor) break;
      page++;
    }

    if (itemBatch.length > 0) {
      await this.repository.bulkCreateItemResults(itemBatch);
    }
  }

  private async pullReturn(job: IReturnSyncJob, adapter: ReturnSyncAdapter, rawReturn: Record<string, unknown>): Promise<ReturnItemSyncResult> {
    try {
      const externalReturnId = this.extractExternalId(rawReturn);
      if (!externalReturnId) {
        return {
          externalId: null, itemType: ReturnItemType.FULL, operation: SyncItemOperation.NOOP,
          status: SyncItemStatus.FAILED, errorCode: MP_RETURN_SYNC_ERROR_CODES.MAPPING_FAILED,
          errorMessage: 'Missing external return ID', retryable: false,
        };
      }

      const normalized = this.mapper.normalizeInbound(rawReturn, externalReturnId, job.providerKey, job.marketplaceKey);
      const checksum = this.computeChecksum(normalized);

      const existingRef = await this.repository.findExternalRefByReturnId(job.workspaceId, job.accountId, externalReturnId);
      const existingAtlasReturn = existingRef?.['internalReturnId'] ? { id: existingRef['internalReturnId'] as string, status: existingRef['status'] as string, refundAmount: existingRef['refundAmount'] as number | null } : null;

      if (existingRef?.['checksum'] === checksum) {
        return {
          externalId: externalReturnId, internalId: existingRef['internalReturnId'] as string,
          rmaNumber: normalized.externalRmaNumber ?? null, itemType: ReturnItemType.FULL,
          operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
        };
      }

      const conflict = await this.conflictResolver.detectConflict(normalized, existingAtlasReturn, job.workspaceId, job.accountId);
      if (conflict.hasConflict && job.conflictStrategy && [ConflictStrategy.SKIP, ConflictStrategy.FLAG].includes(job.conflictStrategy)) {
        const resolved = await this.conflictResolver.resolve(
          conflict.conflictType!,
          normalized,
          existingAtlasReturn,
          job.conflictStrategy,
          job.workspaceId,
          job.id,
          job.accountId,
        );

        if (job.conflictStrategy === ConflictStrategy.SKIP) {
          return {
            externalId: externalReturnId, internalId: existingAtlasReturn?.id ?? null,
            rmaNumber: normalized.externalRmaNumber ?? null, itemType: ReturnItemType.FULL,
            operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
          };
        }

        if (job.conflictStrategy === ConflictStrategy.FLAG) {
          return {
            externalId: externalReturnId, internalId: existingAtlasReturn?.id ?? null,
            rmaNumber: normalized.externalRmaNumber ?? null, itemType: ReturnItemType.FULL,
            operation: SyncItemOperation.NOOP, status: SyncItemStatus.CONFLICT, retryable: false,
          };
        }
      }

      const operation = existingAtlasReturn ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;
      const internalReturnId = existingAtlasReturn?.id ?? `return_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        externalReturnId,
        internalReturnId,
        externalOrderId: normalized.externalOrderId ?? null,
        rmaNumber: normalized.externalRmaNumber ?? null,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        itemType: ReturnItemType.FULL,
        status: normalized.status ?? null,
        lastSyncedAt: new Date(),
        checksum,
        metadata: normalized.metadata,
      });

      await this.eventQueue.enqueue({
        event: operation === SyncItemOperation.CREATE ? ReturnSyncEvent.RETURN_IMPORTED : ReturnSyncEvent.RETURN_UPDATED,
        jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        direction: job.direction, scope: job.scope, itemType: job.itemType,
        externalReturnId, internalReturnId, rmaNumber: normalized.externalRmaNumber ?? null,
        timestamp: new Date(),
      });

      return {
        externalId: externalReturnId, internalId: internalReturnId,
        rmaNumber: normalized.externalRmaNumber ?? null, itemType: ReturnItemType.FULL,
        operation, status: SyncItemStatus.SYNCED, retryable: false,
      };
    } catch (err) {
      return {
        externalId: this.extractExternalId(rawReturn) ?? null,
        itemType: ReturnItemType.FULL, operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_RETURN_SYNC_ERROR_CODES.RETURN_IMPORT_FAILED,
        errorMessage: (err as Error).message.substring(0, 500),
        retryable: true,
      };
    }
  }

  private extractExternalId(raw: Record<string, unknown>): string | null {
    const id = raw['id'] ?? raw['returnId'] ?? raw['return_id'] ?? raw['externalReturnId'];
    return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;
  }

  private computeChecksum(normalized: NormalizedReturnItem): string {
    const payload = JSON.stringify(normalized, Object.keys(normalized).sort());
    return createHash('sha256').update(payload).digest('hex');
  }
}
