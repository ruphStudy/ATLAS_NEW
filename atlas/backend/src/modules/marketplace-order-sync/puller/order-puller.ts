import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ConflictStrategy,
  IOrderSyncJob,
  OrderItemSyncResult,
  OrderItemType,
  OrderSyncAdapter,
  OrderSyncEvent,
  NormalizedOrderItem,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { OrderSyncRepository } from '../repository/order-sync.repository';
import { OrderSyncStateManager } from '../state/order-sync-state.manager';
import { OrderSyncEventQueue } from '../events/order-sync-events.queue';
import { OrderSyncConflictResolver } from '../conflict/order-sync-conflict.resolver';
import { OrderMapper } from '../mapper/order-mapper';
import { MP_ORDER_SYNC_CONSTANTS, MP_ORDER_SYNC_ERROR_CODES } from '../constants';

@Injectable()
export class OrderPuller {
  private readonly logger = new Logger(OrderPuller.name);

  constructor(
    private readonly repository: OrderSyncRepository,
    private readonly stateManager: OrderSyncStateManager,
    private readonly eventQueue: OrderSyncEventQueue,
    private readonly conflictResolver: OrderSyncConflictResolver,
    private readonly mapper: OrderMapper,
  ) {}

  async run(job: IOrderSyncJob, adapter: OrderSyncAdapter): Promise<void> {
    if (!adapter.fetchOrders) {
      this.logger.warn(`Adapter '${job.providerKey}' does not support fetchOrders — skipping inbound`);
      return;
    }

    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_ORDER_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor });
        await this.eventQueue.enqueue({
          event: OrderSyncEvent.CANCELLED,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          direction: job.direction, scope: job.scope, itemType: job.itemType,
          timestamp: new Date(),
        });
        return;
      }

      const pageResult = await adapter.fetchOrders({
        providerKey: job.providerKey,
        accountId: job.accountId,
        cursor,
        pageSize: MP_ORDER_SYNC_CONSTANTS.ORDERS_PER_PAGE,
        filterOptions: job.filterOptions,
      });

      if (!pageResult.orders?.length) break;

      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, { totalItems: pageResult.totalCount });
      }

      const counters = { processedItems: 0, importedOrders: 0, updatedOrders: 0, cancelledOrders: 0, failedItems: 0, skippedItems: 0, conflictItems: 0 };

      for (const rawOrder of pageResult.orders) {
        const start = Date.now();
        const result = await this.pullOrder(job, adapter, rawOrder as Record<string, unknown>);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id, workspaceId: job.workspaceId,
          externalId: result.externalId, internalId: result.internalId ?? null, orderNumber: result.orderNumber ?? null,
          itemType: result.itemType, operation: result.operation, status: result.status,
          errorCode: result.errorCode ?? null, errorMessage: result.errorMessage ?? null,
          retryable: result.retryable, processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) {
          if (result.operation === SyncItemOperation.CREATE) counters.importedOrders++;
          else if (result.operation === SyncItemOperation.UPDATE) counters.updatedOrders++;
          else if (result.operation === SyncItemOperation.CANCEL) counters.cancelledOrders++;
        }
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else if (result.status === SyncItemStatus.CONFLICT) counters.conflictItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_ORDER_SYNC_CONSTANTS.ORDER_RESULT_FLUSH_SIZE) {
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

  private async pullOrder(job: IOrderSyncJob, adapter: OrderSyncAdapter, rawOrder: Record<string, unknown>): Promise<OrderItemSyncResult> {
    try {
      const externalOrderId = this.extractExternalId(rawOrder);
      if (!externalOrderId) {
        return {
          externalId: null, itemType: OrderItemType.STANDARD, operation: SyncItemOperation.NOOP,
          status: SyncItemStatus.FAILED, errorCode: MP_ORDER_SYNC_ERROR_CODES.MAPPING_FAILED,
          errorMessage: 'Missing external order ID', retryable: false,
        };
      }

      const normalized = this.mapper.normalizeInbound(rawOrder, externalOrderId, job.providerKey, job.marketplaceKey);
      const checksum = this.computeChecksum(normalized);

      const existingRef = await this.repository.findExternalRefByOrderId(job.workspaceId, job.accountId, externalOrderId);
      const existingAtlasOrder = existingRef?.['internalOrderId'] ? { id: existingRef['internalOrderId'], status: existingRef['status'] } : null;

      if (existingRef?.['checksum'] === checksum) {
        return {
          externalId: externalOrderId, internalId: existingRef['internalOrderId'] as string,
          orderNumber: normalized.externalOrderNumber ?? null, itemType: OrderItemType.STANDARD,
          operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
        };
      }

      const conflict = await this.conflictResolver.detectConflict(normalized, existingAtlasOrder, job.workspaceId, job.accountId);
      if (conflict.hasConflict && job.conflictStrategy && [ConflictStrategy.SKIP, ConflictStrategy.FLAG].includes(job.conflictStrategy)) {
        const resolved = await this.conflictResolver.resolve(
          conflict.conflictType!,
          normalized,
          existingAtlasOrder,
          job.conflictStrategy,
          job.workspaceId,
          job.id,
          job.accountId,
        );

        if (job.conflictStrategy === ConflictStrategy.SKIP) {
          return {
            externalId: externalOrderId, internalId: existingAtlasOrder?.['id'] as string,
            orderNumber: normalized.externalOrderNumber ?? null, itemType: OrderItemType.STANDARD,
            operation: SyncItemOperation.NOOP, status: SyncItemStatus.CONFLICT, retryable: false,
          };
        }
      }

      const operation = existingRef ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;
      const internalOrderId = existingRef?.['internalOrderId'] as string | undefined ?? `ord_${externalOrderId}`;

      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        externalOrderId,
        internalOrderId,
        orderNumber: normalized.externalOrderNumber ?? null,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        itemType: OrderItemType.STANDARD,
        status: normalized.status ?? null,
        lastSyncedAt: new Date(),
        checksum,
        metadata: normalized.metadata ?? null,
      });

      await this.eventQueue.enqueue({
        event: operation === SyncItemOperation.CREATE ? OrderSyncEvent.ORDER_IMPORTED : OrderSyncEvent.ORDER_UPDATED,
        jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        direction: job.direction, scope: job.scope, itemType: job.itemType,
        timestamp: new Date(),
      });

      return {
        externalId: externalOrderId, internalId: internalOrderId,
        orderNumber: normalized.externalOrderNumber ?? null, itemType: OrderItemType.STANDARD,
        operation, status: SyncItemStatus.SYNCED, retryable: false,
      };
    } catch (err) {
      return {
        externalId: this.extractExternalId(rawOrder), itemType: OrderItemType.STANDARD,
        operation: SyncItemOperation.NOOP, status: SyncItemStatus.FAILED,
        errorCode: MP_ORDER_SYNC_ERROR_CODES.ADAPTER_ERROR,
        errorMessage: (err as Error).message, retryable: true,
      };
    }
  }

  private extractExternalId(raw: Record<string, unknown>): string | null {
    const id = raw['id'] ?? raw['orderId'] ?? raw['order_id'] ?? raw['externalOrderId'];
    return id ? String(id) : null;
  }

  private computeChecksum(normalized: NormalizedOrderItem): string {
    const sorted = JSON.stringify(normalized, Object.keys(normalized).sort());
    return createHash('sha256').update(sorted).digest('hex');
  }
}
