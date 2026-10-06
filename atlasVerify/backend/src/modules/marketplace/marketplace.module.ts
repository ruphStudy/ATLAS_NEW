import { Module } from '@nestjs/common';
import { MarketplaceProviderModule } from '@modules/marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '@modules/marketplace-provider-factory/marketplace-provider-factory.module';
import { MarketplaceAccountModule } from '@modules/marketplace-account/marketplace-account.module';
import { MarketplaceCapabilityModule } from '@modules/marketplace-capability/marketplace-capability.module';
import { MarketplaceCatalogSyncModule } from '@modules/marketplace-catalog-sync/marketplace-catalog-sync.module';
import { MarketplaceInventorySyncModule } from '@modules/marketplace-inventory-sync/marketplace-inventory-sync.module';
import { MarketplaceHealthModule } from '@modules/marketplace-health/marketplace-health.module';
import { MarketplaceErrorNormalizerModule } from '@modules/marketplace-error-normalizer/marketplace-error-normalizer.module';

import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceRepository } from './marketplace.repository';
import { MarketplaceFrameworkEventQueue } from './jobs/marketplace-framework-events.queue';

/**
 * MarketplaceModule
 *
 * Central Multi-Marketplace Framework — the single workspace-scoped entry
 * point for operating Amazon, Flipkart and future marketplaces from one
 * ATLAS workspace. Owns no marketplace-specific business logic; every
 * capability is composed from the existing provider registry/factory,
 * account, capability, catalog-sync, inventory-sync, health and
 * error-normalizer modules (ARCH-002).
 */
@Module({
  imports: [
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
    MarketplaceAccountModule,
    MarketplaceCapabilityModule,
    MarketplaceCatalogSyncModule,
    MarketplaceInventorySyncModule,
    MarketplaceHealthModule,
    MarketplaceErrorNormalizerModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceRepository, MarketplaceFrameworkEventQueue],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
