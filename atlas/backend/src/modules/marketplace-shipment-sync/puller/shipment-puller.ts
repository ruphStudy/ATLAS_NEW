import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  ConflictStrategy,
  IShipmentSyncJob,
  ShipmentItemSyncResult,
  ShipmentItemType,
  ShipmentSyncAdapter,
  ShipmentSyncEvent,
  NormalizedShipmentItem,
  SyncItemOperation,
  SyncItemStatus,
  SyncJobStatus,
} from '../interfaces';
import { ShipmentSyncRepository } from '../repository/shipment-sync.repository';
import { ShipmentSyncStateManager } from '../state/shipment-sync-state.manager';
import { ShipmentSyncEventQueue } from '../events/shipment-sync-events.queue';
import { ShipmentSyncConflictResolver } from '../conflict/shipment-sync-conflict.resolver';
import { ShipmentMapper } from '../mapper/shipment-mapper';
import { MP_SHIPMENT_SYNC_CONSTANTS, MP_SHIPMENT_SYNC_ERROR_CODES } from '../constants';

@Injectable()
export class ShipmentPuller {
  private readonly logger = new Logger(ShipmentPuller.name);

  constructor(
    private readonly repository: ShipmentSyncRepository,
    private readonly stateManager: ShipmentSyncStateManager,
    private readonly eventQueue: ShipmentSyncEventQueue,
    private readonly conflictResolver: ShipmentSyncConflictResolver,
    private readonly mapper: ShipmentMapper,
  ) {}

  async run(job: IShipmentSyncJob, adapter: ShipmentSyncAdapter): Promise<void> {
    if (!adapter.fetchShipments) {
      this.logger.warn(`Adapter '${job.providerKey}' does not support fetchShipments — skipping inbound`);
      return;
    }

    let cursor: string | null | undefined = job.cursor ?? null;
    let page = 0;
    let itemBatch: Record<string, unknown>[] = [];

    while (page < MP_SHIPMENT_SYNC_CONSTANTS.MAX_PAGES_PER_JOB) {
      if (this.stateManager.isCancelled(job.id)) {
        await this.repository.updateJob(job.id, job.workspaceId, { status: SyncJobStatus.CANCELLED, cursor });
        await this.eventQueue.enqueue({
          event: ShipmentSyncEvent.CANCELLED,
          jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
          accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
          direction: job.direction, scope: job.scope, itemType: job.itemType,
          timestamp: new Date(),
        });
        return;
      }

      const pageResult = await adapter.fetchShipments({
        providerKey: job.providerKey,
        accountId: job.accountId,
        cursor,
        pageSize: MP_SHIPMENT_SYNC_CONSTANTS.SHIPMENTS_PER_PAGE,
        filterOptions: job.filterOptions,
      });

      if (!pageResult.shipments?.length) break;

      if (page === 0 && pageResult.totalCount != null) {
        await this.repository.updateJob(job.id, job.workspaceId, { totalItems: pageResult.totalCount });
      }

      const counters = { processedItems: 0, importedShipments: 0, updatedShipments: 0, cancelledShipments: 0, deliveredShipments: 0, failedItems: 0, skippedItems: 0, conflictItems: 0 };

      for (const rawShipment of pageResult.shipments) {
        const start = Date.now();
        const result = await this.pullShipment(job, adapter, rawShipment as Record<string, unknown>);
        const processingMs = Date.now() - start;

        itemBatch.push({
          jobId: job.id, workspaceId: job.workspaceId,
          externalId: result.externalId, internalId: result.internalId ?? null, trackingNumber: result.trackingNumber ?? null,
          itemType: result.itemType, operation: result.operation, status: result.status,
          errorCode: result.errorCode ?? null, errorMessage: result.errorMessage ?? null,
          retryable: result.retryable, processingMs,
        });

        counters.processedItems++;
        if (result.status === SyncItemStatus.SYNCED) {
          if (result.operation === SyncItemOperation.CREATE) counters.importedShipments++;
          else if (result.operation === SyncItemOperation.UPDATE) counters.updatedShipments++;
          else if (result.operation === SyncItemOperation.CANCEL) counters.cancelledShipments++;
          else if (result.operation === SyncItemOperation.DELIVER) counters.deliveredShipments++;
        }
        else if (result.status === SyncItemStatus.FAILED) counters.failedItems++;
        else if (result.status === SyncItemStatus.CONFLICT) counters.conflictItems++;
        else counters.skippedItems++;

        if (itemBatch.length >= MP_SHIPMENT_SYNC_CONSTANTS.SHIPMENT_RESULT_FLUSH_SIZE) {
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

  private async pullShipment(job: IShipmentSyncJob, adapter: ShipmentSyncAdapter, rawShipment: Record<string, unknown>): Promise<ShipmentItemSyncResult> {
    try {
      const externalShipmentId = this.extractExternalId(rawShipment);
      if (!externalShipmentId) {
        return {
          externalId: null, itemType: ShipmentItemType.STANDARD, operation: SyncItemOperation.NOOP,
          status: SyncItemStatus.FAILED, errorCode: MP_SHIPMENT_SYNC_ERROR_CODES.MAPPING_FAILED,
          errorMessage: 'Missing external shipment ID', retryable: false,
        };
      }

      const normalized = this.mapper.normalizeInbound(rawShipment, externalShipmentId, job.providerKey, job.marketplaceKey);
      const checksum = this.computeChecksum(normalized);

      const existingRef = await this.repository.findExternalRefByShipmentId(job.workspaceId, job.accountId, externalShipmentId);
      const existingAtlasShipment = existingRef?.['internalShipmentId'] ? { id: existingRef['internalShipmentId'] as string, status: existingRef['status'] as string, trackingNumber: existingRef['trackingNumber'] as string | null } : null;

      if (existingRef?.['checksum'] === checksum) {
        return {
          externalId: externalShipmentId, internalId: existingRef['internalShipmentId'] as string,
          trackingNumber: normalized.trackingNumber ?? null, itemType: ShipmentItemType.STANDARD,
          operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
        };
      }

      const conflict = await this.conflictResolver.detectConflict(normalized, existingAtlasShipment, job.workspaceId, job.accountId);
      if (conflict.hasConflict && job.conflictStrategy && [ConflictStrategy.SKIP, ConflictStrategy.FLAG].includes(job.conflictStrategy)) {
        const resolved = await this.conflictResolver.resolve(
          conflict.conflictType!,
          normalized,
          existingAtlasShipment,
          job.conflictStrategy,
          job.workspaceId,
          job.id,
          job.accountId,
        );

        if (job.conflictStrategy === ConflictStrategy.SKIP) {
          return {
            externalId: externalShipmentId, internalId: existingAtlasShipment?.id ?? null,
            trackingNumber: normalized.trackingNumber ?? null, itemType: ShipmentItemType.STANDARD,
            operation: SyncItemOperation.NOOP, status: SyncItemStatus.SKIPPED, retryable: false,
          };
        }

        if (job.conflictStrategy === ConflictStrategy.FLAG) {
          return {
            externalId: externalShipmentId, internalId: existingAtlasShipment?.id ?? null,
            trackingNumber: normalized.trackingNumber ?? null, itemType: ShipmentItemType.STANDARD,
            operation: SyncItemOperation.NOOP, status: SyncItemStatus.CONFLICT, retryable: false,
          };
        }
      }

      const operation = existingAtlasShipment ? SyncItemOperation.UPDATE : SyncItemOperation.CREATE;
      const internalShipmentId = existingAtlasShipment?.id ?? `shipment_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await this.repository.upsertExternalRef({
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        externalShipmentId,
        internalShipmentId,
        externalOrderId: normalized.externalOrderId ?? null,
        trackingNumber: normalized.trackingNumber ?? null,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        itemType: ShipmentItemType.STANDARD,
        status: normalized.status ?? null,
        lastSyncedAt: new Date(),
        checksum,
        metadata: normalized.metadata,
      });

      await this.eventQueue.enqueue({
        event: operation === SyncItemOperation.CREATE ? ShipmentSyncEvent.SHIPMENT_IMPORTED : ShipmentSyncEvent.SHIPMENT_UPDATED,
        jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        direction: job.direction, scope: job.scope, itemType: job.itemType,
        externalShipmentId, internalShipmentId, trackingNumber: normalized.trackingNumber ?? null,
        timestamp: new Date(),
      });

      return {
        externalId: externalShipmentId, internalId: internalShipmentId,
        trackingNumber: normalized.trackingNumber ?? null, itemType: ShipmentItemType.STANDARD,
        operation, status: SyncItemStatus.SYNCED, retryable: false,
      };
    } catch (err) {
      return {
        externalId: this.extractExternalId(rawShipment) ?? null,
        itemType: ShipmentItemType.STANDARD, operation: SyncItemOperation.NOOP,
        status: SyncItemStatus.FAILED,
        errorCode: MP_SHIPMENT_SYNC_ERROR_CODES.SHIPMENT_IMPORT_FAILED,
        errorMessage: (err as Error).message.substring(0, 500),
        retryable: true,
      };
    }
  }

  private extractExternalId(raw: Record<string, unknown>): string | null {
    const id = raw['id'] ?? raw['shipmentId'] ?? raw['shipment_id'] ?? raw['externalShipmentId'];
    return typeof id === 'string' ? id : typeof id === 'number' ? String(id) : null;
  }

  private computeChecksum(normalized: NormalizedShipmentItem): string {
    const payload = JSON.stringify(normalized, Object.keys(normalized).sort());
    return createHash('sha256').update(payload).digest('hex');
  }
}
