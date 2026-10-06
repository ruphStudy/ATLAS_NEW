import { Injectable, Logger } from '@nestjs/common';
import { PriceSyncRepository } from '../repository/price-sync.repository';
import { ConflictResolutionStrategy, NormalizedPriceItem } from '../interfaces';

@Injectable()
export class PriceSyncConflictResolver {
  private readonly logger = new Logger(PriceSyncConflictResolver.name);

  constructor(private readonly repository: PriceSyncRepository) {}

  async detectConflict(
    marketplacePrice: NormalizedPriceItem,
    atlasPrice: any,
  ): Promise<boolean> {
    if (!atlasPrice) return false;

    const hasBasePriceConflict = marketplacePrice.basePrice !== atlasPrice.basePrice;
    const hasSalePriceConflict = marketplacePrice.salePrice !== atlasPrice.salePrice;
    const hasCurrencyConflict = marketplacePrice.currency !== atlasPrice.currency;
    const hasEffectiveDateConflict =
      marketplacePrice.effectiveFrom?.getTime() !== atlasPrice.effectiveFrom?.getTime();

    return hasBasePriceConflict || hasSalePriceConflict || hasCurrencyConflict || hasEffectiveDateConflict;
  }

  async resolveConflict(
    strategy: ConflictResolutionStrategy,
    marketplacePrice: NormalizedPriceItem,
    atlasPrice: any,
  ): Promise<{
    resolved: boolean;
    useMarketplaceData: boolean;
    mergedData?: Partial<NormalizedPriceItem>;
    requiresManualReview: boolean;
  }> {
    switch (strategy) {
      case ConflictResolutionStrategy.MARKETPLACE_WINS:
        return {
          resolved: true,
          useMarketplaceData: true,
          requiresManualReview: false,
        };

      case ConflictResolutionStrategy.ATLAS_WINS:
        return {
          resolved: true,
          useMarketplaceData: false,
          requiresManualReview: false,
        };

      case ConflictResolutionStrategy.NEWEST_WINS:
        const marketplaceNewer = new Date(marketplacePrice.lastUpdatedAt) > new Date(atlasPrice.updatedAt);
        return {
          resolved: true,
          useMarketplaceData: marketplaceNewer,
          requiresManualReview: false,
        };

      case ConflictResolutionStrategy.HIGHEST_PRICE_WINS:
        const useMarketplace = (marketplacePrice.basePrice || 0) > (atlasPrice.basePrice || 0);
        return {
          resolved: true,
          useMarketplaceData: useMarketplace,
          requiresManualReview: false,
        };

      case ConflictResolutionStrategy.LOWEST_PRICE_WINS:
        const useAtlas = (atlasPrice.basePrice || Infinity) < (marketplacePrice.basePrice || Infinity);
        return {
          resolved: true,
          useMarketplaceData: !useAtlas,
          requiresManualReview: false,
        };

      case ConflictResolutionStrategy.SKIP:
        return {
          resolved: true,
          useMarketplaceData: false,
          requiresManualReview: false,
        };

      case ConflictResolutionStrategy.FLAG:
      default:
        return {
          resolved: false,
          useMarketplaceData: false,
          requiresManualReview: true,
        };
    }
  }

  async recordConflict(
    workspaceId: string,
    accountId: string,
    jobId: string,
    externalPriceId: string,
    sku: string,
    conflictType: string,
    marketplaceData: Record<string, any>,
    atlasData: Record<string, any>,
  ): Promise<void> {
    await this.repository.createConflict({
      workspaceId,
      accountId,
      jobId,
      externalPriceId,
      sku,
      conflictType,
      marketplaceData,
      atlasData,
      isResolved: false,
    });
  }

  async markConflictResolved(
    conflictId: string,
    workspaceId: string,
    resolution: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<void> {
    await this.repository.updateConflict(conflictId, workspaceId, {
      isResolved: true,
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
      notes,
    });
  }
}
