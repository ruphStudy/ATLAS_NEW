import { Injectable, Logger } from '@nestjs/common';
import {
  ConflictStrategy,
  IListingSyncJob,
  ListingConflictType,
  NormalizedListingItem,
} from '../interfaces';
import { ListingSyncRepository } from '../repository/listing-sync.repository';

@Injectable()
export class ListingSyncConflictResolver {
  private readonly logger = new Logger(ListingSyncConflictResolver.name);

  constructor(private readonly repository: ListingSyncRepository) {}

  async detect(
    item: NormalizedListingItem,
    existingRef: Record<string, unknown> | null,
    job: IListingSyncJob,
  ): Promise<ListingConflictType | null> {
    if (!existingRef) return null;

    // Checksum match — no change
    if (item.checksum && existingRef['checksum'] === item.checksum) return null;

    // Title mismatch
    if (item.title && existingRef['externalTitle'] && item.title !== existingRef['externalTitle']) {
      return ListingConflictType.TITLE_MISMATCH;
    }

    // Price mismatch
    if (item.price != null && existingRef['price'] != null && item.price !== Number(existingRef['price'])) {
      return ListingConflictType.PRICE_MISMATCH;
    }

    // Status mismatch
    if (item.status && existingRef['listingStatus'] && item.status !== existingRef['listingStatus']) {
      return ListingConflictType.STATUS_MISMATCH;
    }

    return null;
  }

  resolveStrategy(
    conflictType: ListingConflictType,
    strategy: ConflictStrategy | null,
    item: NormalizedListingItem,
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
        const mpTs = item.updatedAt.getTime();
        const atlasTs = new Date(existingRef['lastSyncedAt'] as string | Date).getTime();
        return mpTs >= atlasTs ? 'PROCEED' : 'SKIP';
      }
      case ConflictStrategy.SKIP:
        return 'SKIP';
      case ConflictStrategy.FLAG:
        return 'FLAG';
      default:
        return 'FLAG';
    }
  }

  async persistConflict(
    job: IListingSyncJob,
    item: NormalizedListingItem,
    conflictType: ListingConflictType,
    resolution: 'PROCEED' | 'SKIP' | 'FLAG',
    existingRef: Record<string, unknown> | null,
  ): Promise<void> {
    try {
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
        atlasSnapshot: existingRef ? this.sanitize(existingRef) : null,
        marketplaceSnapshot: this.sanitize(item.raw),
      });
    } catch (err) {
      this.logger.warn(`Failed to persist listing conflict for '${item.externalId}': ${(err as Error).message}`);
    }
  }

  private sanitize(data: unknown): Record<string, unknown> {
    const obj = data as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.match(/(secret|token|password|credential|key)/i)) continue;
      clean[k] = v;
    }
    return clean;
  }
}
