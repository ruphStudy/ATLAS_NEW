import { Injectable, Logger } from '@nestjs/common';
import {
  IShipmentSyncJob,
  ShipmentItemSyncResult,
  ShipmentItemType,
  ShipmentSyncAdapter,
  ShipmentSyncEvent,
  SyncItemOperation,
  SyncItemStatus,
} from '../interfaces';
import { ShipmentSyncRepository } from '../repository/shipment-sync.repository';
import { ShipmentSyncEventQueue } from '../events/shipment-sync-events.queue';
import { ShipmentMapper } from '../mapper/shipment-mapper';
import { MP_SHIPMENT_SYNC_ERROR_CODES } from '../constants';

@Injectable()
export class ShipmentPusher {
  private readonly logger = new Logger(ShipmentPusher.name);

  constructor(
    private readonly repository: ShipmentSyncRepository,
    private readonly eventQueue: ShipmentSyncEventQueue,
    private readonly mapper: ShipmentMapper,
  ) {}

  async pushShipment(
    job: IShipmentSyncJob,
    adapter: ShipmentSyncAdapter,
    shipment: Record<string, unknown>,
  ): Promise<ShipmentItemSyncResult> {
    try {
      if (!adapter.pushShipment) {
        return {
          externalId: null, itemType: ShipmentItemType.STANDARD, operation: SyncItemOperation.NOOP,
          status: SyncItemStatus.FAILED, errorCode: MP_SHIPMENT_SYNC_ERROR_CODES.ADAPTER_ERROR,
          errorMessage: 'Adapter does not support pushShipment', retryable: false,
        };
      }

      const normalized = this.mapper.normalizeOutbound(shipment);
      const result = await adapter.pushShipment({
        providerKey: job.providerKey,
        accountId: job.accountId,
        shipment: normalized,
      });

      if (!result.success) {
        return {
          externalId: result.externalShipmentId ?? null,
          itemType: ShipmentItemType.STANDARD, operation: SyncItemOperation.CREATE,
          status: SyncItemStatus.FAILED,
          errorCode: result.errorCode ?? MP_SHIPMENT_SYNC_ERROR_CODES.SHIPMENT_PUSH_FAILED,
          errorMessage: result.errorMessage ?? 'Push failed',
          retryable: true,
        };
      }

      await this.eventQueue.enqueue({
        event: ShipmentSyncEvent.SHIPMENT_IMPORTED,
        jobId: job.id, correlationId: job.correlationId, workspaceId: job.workspaceId,
        accountId: job.accountId, providerKey: job.providerKey, marketplaceKey: job.marketplaceKey,
        direction: job.direction, scope: job.scope, itemType: job.itemType,
        externalShipmentId: result.externalShipmentId ?? null,
        internalShipmentId: shipment['id'] as string,
        timestamp: new Date(),
      });

      return {
        externalId: result.externalShipmentId ?? null,
        internalId: shipment['id'] as string,
        itemType: ShipmentItemType.STANDARD, operation: SyncItemOperation.CREATE,
        status: SyncItemStatus.SYNCED, retryable: false,
      };
    } catch (err) {
      return {
        externalId: null, itemType: ShipmentItemType.STANDARD, operation: SyncItemOperation.CREATE,
        status: SyncItemStatus.FAILED,
        errorCode: MP_SHIPMENT_SYNC_ERROR_CODES.SHIPMENT_PUSH_FAILED,
        errorMessage: (err as Error).message.substring(0, 500),
        retryable: true,
      };
    }
  }
}
