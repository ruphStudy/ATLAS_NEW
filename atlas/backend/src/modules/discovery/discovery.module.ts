import { Module } from '@nestjs/common';
import { AmazonAdapterModule } from '@modules/marketplace-adapter/adapters/amazon/amazon-adapter.module';
import { ProductTaxonomyModule } from '@modules/product-taxonomy/product-taxonomy.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { DiscoveryRepository } from './discovery.repository';
import { DiscoveryQueue } from './jobs/discovery.queue';
import { DiscoveryProcessor } from './jobs/discovery.processor';
import { AmazonAdapter } from './adapters/amazon/amazon.adapter';
import { MarketplaceAdapterRegistry } from './adapters/adapter.registry';

@Module({
  // ProductTaxonomyModule provides ColdStartDiscoveryService, used by
  // DiscoveryProcessor for the TREND_COLD_START mode.
  imports: [AmazonAdapterModule, ProductTaxonomyModule],
  controllers: [DiscoveryController],
  providers: [
    // Core
    DiscoveryService,
    DiscoveryRepository,

    // Queue + Worker
    DiscoveryQueue,
    DiscoveryProcessor,

    // Adapters
    AmazonAdapter,

    // Registry: factory so future adapters only need to be added here
    {
      provide: MarketplaceAdapterRegistry,
      useFactory: (amazon: AmazonAdapter) => new MarketplaceAdapterRegistry([amazon]),
      inject: [AmazonAdapter],
    },
  ],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
