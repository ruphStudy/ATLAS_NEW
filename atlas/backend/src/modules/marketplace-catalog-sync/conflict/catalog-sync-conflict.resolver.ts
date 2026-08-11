import { Injectable, Logger } from '@nestjs/common';
import {
  ConflictStrategy,
  ICatalogSyncJob,
  NormalizedCatalogItem,
  SyncAdapterItem,
  SyncConflictType,
} from '../interfaces';
import { CatalogSyncRepository } from '../repository/catalog-sync.repository';

@Injectable()
export class CatalogSyncConflictResolver {
  private readonly logger = new Logger(CatalogSyncConflictResolver.name);

  constructor(private readonly repository: CatalogSyncRepository) {}

  /**
   * Detects whether a normalized catalog item conflicts with an existing record.
   * Returns the conflict type, or null if no conflict.
   */
  async detect(
    item: NormalizedCatalogItem,
    existingRef: Record<string, unknown> | null,
    job: ICatalogSyncJob,
  ): Promise<SyncConflictType | null> {
    if (!existingRef) return null;

    // Checksum match → no change
    if (item.checksum && existingRef['checksum'] === item.checksum) return null;

    // Price mismatch
    if (
      item.price !== null &&
      item.price !== undefined &&
      existingRef['price'] !== undefined &&
      existingRef['price'] !== null &&
      Number(existingRef['price']) !== item.price
    ) {
      return SyncConflictType.PRICE_MISMATCH;
    }

    // Inventory mismatch
    if (
      item.inventory !== null &&
      item.inventory !== undefined &&
      existingRef['inventory'] !== undefined &&
      existingRef['inventory'] !== null &&
      Number(existingRef['inventory']) !== item.inventory
    ) {
      return SyncConflictType.INVENTORY_MISMATCH;
    }

    // Listing status conflict
    if (item.listingStatus && existingRef['listingStatus'] && item.listingStatus !== existingRef['listingStatus']) {
      return SyncConflictType.LISTING_STATUS_CONFLICT;
    }

    // Attribute conflict (detect changed attributes)
    if (item.attributes && Object.keys(item.attributes).length > 0 && existingRef['attributes']) {
      const existingAttrs = existingRef['attributes'] as Record<string, unknown>;
      for (const [key, value] of Object.entries(item.attributes)) {
        if (existingAttrs[key] !== undefined && existingAttrs[key] !== value) {
          return SyncConflictType.ATTRIBUTE_CONFLICT;
        }
      }
    }

    return null;
  }

  /**
   * Detects conflict from a raw adapter item (used in tests/runner without full normalization).
   */
  detectFromRaw(item: SyncAdapterItem): SyncConflictType | null {
    if (!item.data) return null;
    if (item.data['_hasDuplicateSku']) return SyncConflictType.DUPLICATE_SKU;
    if (item.data['_priceMismatch']) return SyncConflictType.PRICE_MISMATCH;
    if (item.data['_inventoryMismatch']) return SyncConflictType.INVENTORY_MISMATCH;
    return null;
  }

  /**
   * Applies conflict strategy to determine resolution action.
   * Returns: 'PROCEED' | 'SKIP' | 'FLAG'
   */
  resolveStrategy(
    conflictType: SyncConflictType,
    strategy: ConflictStrategy | null,
    item: NormalizedCatalogItem,
    existingRef: Record<string, unknown> | null,
  ): 'PROCEED' | 'SKIP' | 'FLAG' {
    const s = strategy ?? ConflictStrategy.MARKETPLACE_WINS;

    switch (s) {
      case ConflictStrategy.MARKETPLACE_WINS:
        return 'PROCEED';

      case ConflictStrategy.ATLAS_WINS:
        return 'SKIP';

      case ConflictStrategy.NEWEST_WINS: {
        if (!item.updatedAt || !existingRef?.['lastSyncedAt']) return 'PROCEED';
        const marketplaceTs = item.updatedAt.getTime();
        const atlasTs = new Date(existingRef['lastSyncedAt'] as string | Date).getTime();
        return marketplaceTs >= atlasTs ? 'PROCEED' : 'SKIP';
      }

      case ConflictStrategy.SKIP:
        return 'SKIP';

      case ConflictStrategy.FLAG:
        return 'FLAG';

      default:
        return 'FLAG';
    }
  }

  /**
   * Persists a conflict record to history.
   */
  async persistConflict(
    job: ICatalogSyncJob,
    item: NormalizedCatalogItem,
    conflictType: SyncConflictType,
    resolution: 'PROCEED' | 'SKIP' | 'FLAG',
    existingRef: Record<string, unknown> | null,
  ): Promise<void> {
    try {
      const safeMarketplace = this.sanitizeSnapshot(item.raw);
      const safeAtlas = existingRef ? this.sanitizeSnapshot(existingRef) : null;

      await this.repository.createConflict({
        jobId: job.id,
        workspaceId: job.workspaceId,
        accountId: job.accountId,
        providerKey: job.providerKey,
        marketplaceKey: job.marketplaceKey,
        externalId: item.externalId,
        internalId: (existingRef?.['internalId'] as string | undefined) ?? null,
        conflictType,
        strategy: job.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
        resolution: resolution === 'PROCEED' ? 'AUTO_RESOLVED' : resolution,
        atlasSnapshot: safeAtlas,
        marketplaceSnapshot: safeMarketplace,
      });
    } catch (err) {
      this.logger.warn(`Failed to persist conflict for '${item.externalId}': ${(err as Error).message}`);
    }
  }

  private sanitizeSnapshot(data: Record<string, unknown>): Record<string, unknown> {
    const unsafe = /secret|token|password|credential|key|auth/i;
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, unsafe.test(k) ? '***' : v]),
    );
  }
}

