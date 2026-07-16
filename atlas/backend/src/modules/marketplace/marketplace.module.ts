import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceRepository } from './marketplace.repository';

/**
 * MarketplaceModule
 *
 * Responsibilities:
 *   - Marketplace adapter registry (Amazon, eBay, Walmart, …)
 *   - Marketplace credential management
 *   - Sync job orchestration
 *   - Marketplace-specific configuration
 *
 * Architecture Note:
 *   Each marketplace is an adapter. Core logic is marketplace-independent (ARCH-002).
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceRepository],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
