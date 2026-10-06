import { Injectable, Logger } from '@nestjs/common';
import {
  ConflictStrategy,
  IInventorySyncJob,
  InventoryConflictType,
  NormalizedInventoryItem,
} from '../interfaces';
import { InventorySyncRepository } from '../repository/inventory-sync.repository';

@Injectable()
export class InventorySyncConflictResolver {
  private readonly logger = new Logger(InventorySyncConflictResolver.name);

  constructor(private readonly repository: InventorySyncRepository) {}

  /**
   * Detects whether an inbound normalized item conflicts with existing ref.
   */
  async detect(
    item: NormalizedInventoryItem,
    existingRef: Record<string, unknown> | null,
    job: IInventorySyncJob,
  ): Promise<InventoryConflictType | null> {
    if (!existingRef) return null;

    // Checksum match — no change
    if (item.checksum && existingRef['checksum'] === item.checksum) return null;

    // Negative inventory guard
    if (item.available < 0) return InventoryConflictType.NEGATIVE_INVENTORY;

    // Quantity mismatch
    const storedAvail = Number(existingRef['available'] ?? 0);
    if (storedAvail !== item.available) return InventoryConflictType.QUANTITY_MISMATCH;

    const storedReserved = Number(existingRef['reserved'] ?? 0);
    if (storedReserved !== item.reserved) return InventoryConflictType.RESERVATION_CONFLICT;

    return null;
  }

  /**
   * Determines how to handle a conflict given the configured strategy.
   */
  resolveStrategy(
    conflictType: InventoryConflictType,
    strategy: ConflictStrategy | null,
    item: NormalizedInventoryItem,
    existingRef: Record<string, unknown> | null,
  ): 'PROCEED' | 'SKIP' | 'FLAG' {
    const s = strategy ?? ConflictStrategy.MARKETPLACE_WINS;
    switch (s) {
      case ConflictStrategy.MARKETPLACE_WINS:
        return conflictType === InventoryConflictType.NEGATIVE_INVENTORY ? 'FLAG' : 'PROCEED';
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
    job: IInventorySyncJob,
    item: NormalizedInventoryItem,
    conflictType: InventoryConflictType,
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
        warehouseId: job.warehouseId ?? null,
        externalId: item.externalId,
        internalId: (existingRef?.['internalId'] as string | undefined) ?? null,
        sku: item.externalSku ?? null,
        conflictType,
        strategy: job.conflictStrategy ?? ConflictStrategy.MARKETPLACE_WINS,
        resolution: resolution === 'PROCEED' ? 'AUTO_RESOLVED' : resolution,
        atlasSnapshot: existingRef ? this.sanitize(existingRef) : null,
        marketplaceSnapshot: this.sanitize(item.raw),
      });
    } catch (err) {
      this.logger.warn(`Failed to persist inventory conflict for '${item.externalId}': ${(err as Error).message}`);
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

  private sanitize(d: Record<string, unknown>): Record<string, unknown> {
    const unsafe = /secret|token|password|credential|key|auth/i;
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, unsafe.test(k) ? '***' : v]));
  }
}
