import { Injectable, Logger } from '@nestjs/common';
import { ConflictStrategy, NormalizedOrderItem, OrderConflictType } from '../interfaces';
import { OrderSyncRepository } from '../repository/order-sync.repository';

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: OrderConflictType;
  marketplaceValue?: Record<string, unknown>;
  atlasValue?: Record<string, unknown>;
}

@Injectable()
export class OrderSyncConflictResolver {
  private readonly logger = new Logger(OrderSyncConflictResolver.name);

  constructor(private readonly repository: OrderSyncRepository) {}

  async detectConflict(
    marketplace: NormalizedOrderItem,
    atlas: { status?: string; total?: number; itemCount?: number; customerEmail?: string } | null,
    workspaceId: string,
    accountId: string,
  ): Promise<ConflictDetectionResult> {
    if (!atlas) return { hasConflict: false };

    if (marketplace.status && atlas.status && marketplace.status !== atlas.status) {
      return {
        hasConflict: true,
        conflictType: OrderConflictType.STATUS_MISMATCH,
        marketplaceValue: { status: marketplace.status },
        atlasValue: { status: atlas.status },
      };
    }

    if (marketplace.total != null && atlas.total != null && Math.abs(marketplace.total - atlas.total) > 0.01) {
      return {
        hasConflict: true,
        conflictType: OrderConflictType.AMOUNT_MISMATCH,
        marketplaceValue: { total: marketplace.total },
        atlasValue: { total: atlas.total },
      };
    }

    if (marketplace.items && atlas.itemCount != null && marketplace.items.length !== atlas.itemCount) {
      return {
        hasConflict: true,
        conflictType: OrderConflictType.ITEM_COUNT_MISMATCH,
        marketplaceValue: { itemCount: marketplace.items.length },
        atlasValue: { itemCount: atlas.itemCount },
      };
    }

    if (marketplace.customer?.email && atlas.customerEmail && marketplace.customer.email !== atlas.customerEmail) {
      return {
        hasConflict: true,
        conflictType: OrderConflictType.CUSTOMER_MISMATCH,
        marketplaceValue: { customerEmail: marketplace.customer.email },
        atlasValue: { customerEmail: atlas.customerEmail },
      };
    }

    return { hasConflict: false };
  }

  async resolve(
    conflictType: OrderConflictType,
    marketplace: NormalizedOrderItem,
    atlas: Record<string, unknown> | null,
    strategy: ConflictStrategy,
    workspaceId: string,
    jobId: string,
    accountId: string,
  ): Promise<NormalizedOrderItem> {
    await this.repository.createConflict({
      workspaceId,
      jobId,
      accountId,
      externalOrderId: marketplace.externalOrderId,
      internalOrderId: (atlas?.['id'] as string) ?? null,
      conflictType,
      marketplaceValue: marketplace as unknown as Record<string, unknown>,
      atlasValue: atlas,
      resolved: strategy !== ConflictStrategy.FLAG,
      resolution: strategy,
    });

    if (strategy === ConflictStrategy.ATLAS_WINS && atlas) {
      return { ...marketplace, ...atlas } as NormalizedOrderItem;
    }

    return marketplace;
  }
}
