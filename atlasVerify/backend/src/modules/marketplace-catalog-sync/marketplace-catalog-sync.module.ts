import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';
import { MarketplaceAccountModule } from '../marketplace-account/marketplace-account.module';
import { MarketplaceListingMappingModule } from '../marketplace-listing-mapping/marketplace-listing-mapping.module';

import { CatalogSyncRepository } from './repository/catalog-sync.repository';
import { CatalogSyncValidator } from './validator/catalog-sync.validator';
import { CatalogSyncStateManager } from './state/catalog-sync-state.manager';
import { CatalogSyncConflictResolver } from './conflict/catalog-sync-conflict.resolver';
import { CatalogSyncEventQueue } from './events/catalog-sync-events.queue';
import { CatalogSyncQueue } from './queue/catalog-sync.queue';
import { CatalogMapper } from './mapper/catalog-mapper';
import { CatalogImporter } from './importer/catalog-importer';
import { CatalogExporter } from './exporter/catalog-exporter';
import { CatalogSyncRunner } from './runner/catalog-sync.runner';
import { CatalogSyncScheduler } from './scheduler/catalog-sync.scheduler';
import { CatalogSyncMetrics } from './metrics/catalog-sync.metrics';
import { MarketplaceCatalogSyncService } from './marketplace-catalog-sync.service';
import { MarketplaceCatalogSyncController } from './marketplace-catalog-sync.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
    MarketplaceAccountModule,
    MarketplaceListingMappingModule,
  ],
  controllers: [MarketplaceCatalogSyncController],
  providers: [
    CatalogSyncRepository,
    CatalogSyncValidator,
    CatalogSyncStateManager,
    CatalogSyncConflictResolver,
    CatalogSyncEventQueue,
    CatalogSyncQueue,
    CatalogMapper,
    CatalogImporter,
    CatalogExporter,
    CatalogSyncRunner,
    CatalogSyncScheduler,
    CatalogSyncMetrics,
    MarketplaceCatalogSyncService,
  ],
  exports: [
    MarketplaceCatalogSyncService,
    CatalogSyncMetrics,
    CatalogSyncStateManager,
  ],
})
export class MarketplaceCatalogSyncModule {}
