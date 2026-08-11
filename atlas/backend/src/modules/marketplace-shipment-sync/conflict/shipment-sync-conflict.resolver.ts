import { Injectable } from '@nestjs/common';
import {
  ConflictStrategy,
  NormalizedShipmentItem,
  ShipmentConflictDetectionResult,
  ShipmentConflictType,
} from '../interfaces';
import { ShipmentSyncRepository } from '../repository/shipment-sync.repository';

@Injectable()
export class ShipmentSyncConflictResolver {
  constructor(private readonly repository: ShipmentSyncRepository) {}

  async detectConflict(
    normalized: NormalizedShipmentItem,
    existingAtlasShipment: { id: string; status?: string; trackingNumber?: string | null } | null,
    workspaceId: string,
    accountId: string,
  ): Promise<ShipmentConflictDetectionResult> {
    if (!existingAtlasShipment) {
      return { hasConflict: false };
    }

    const details: { field: string; atlasValue: unknown; marketplaceValue: unknown }[] = [];

    if (existingAtlasShipment.status && normalized.status && existingAtlasShipment.status !== normalized.status) {
      details.push({
        field: 'status',
        atlasValue: existingAtlasShipment.status,
        marketplaceValue: normalized.status,
      });
    }

    if (existingAtlasShipment.trackingNumber && normalized.trackingNumber && existingAtlasShipment.trackingNumber !== normalized.trackingNumber) {
      details.push({
        field: 'trackingNumber',
        atlasValue: existingAtlasShipment.trackingNumber,
        marketplaceValue: normalized.trackingNumber,
      });
    }

    if (details.length === 0) {
      return { hasConflict: false };
    }

    const conflictType = details.some((d) => d.field === 'status')
      ? ShipmentConflictType.STATUS_MISMATCH
      : ShipmentConflictType.TRACKING_MISMATCH;

    return {
      hasConflict: true,
      conflictType,
      details,
    };
  }

  async resolve(
    conflictType: ShipmentConflictType,
    normalized: NormalizedShipmentItem,
    existingAtlasShipment: { id: string; status?: string } | null,
    strategy: ConflictStrategy,
    workspaceId: string,
    jobId: string,
    accountId: string,
  ): Promise<{ shouldUpdate: boolean; mergedData?: Partial<NormalizedShipmentItem> }> {
    if (strategy === ConflictStrategy.SKIP) {
      return { shouldUpdate: false };
    }

    if (strategy === ConflictStrategy.FLAG) {
      await this.repository.createConflict({
        jobId,
        workspaceId,
        accountId,
        externalShipmentId: normalized.externalShipmentId,
        internalShipmentId: existingAtlasShipment?.id ?? null,
        conflictType,
        details: { normalized, existing: existingAtlasShipment },
      });
      return { shouldUpdate: false };
    }

    if (strategy === ConflictStrategy.MARKETPLACE_WINS) {
      return { shouldUpdate: true, mergedData: normalized };
    }

    if (strategy === ConflictStrategy.ATLAS_WINS) {
      return { shouldUpdate: false };
    }

    if (strategy === ConflictStrategy.NEWEST_WINS) {
      return { shouldUpdate: true, mergedData: normalized };
    }

    return { shouldUpdate: false };
  }
}
