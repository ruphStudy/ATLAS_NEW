import { Module } from '@nestjs/common';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderConfigModule } from '../marketplace-provider-config/marketplace-provider-config.module';
import { MarketplaceProviderCredentialsModule } from '../marketplace-provider-credentials/marketplace-provider-credentials.module';

import { MarketplaceProviderInstanceCache } from './cache/marketplace-provider-instance.cache';
import { MarketplaceProviderFactoryValidator } from './validator/marketplace-provider-factory.validator';
import { MarketplaceProviderFactoryErrorNormalizer } from './errors/marketplace-provider-factory.error-normalizer';
import { MarketplaceProviderFactoryMetrics } from './metrics/marketplace-provider-factory.metrics';
import { MarketplaceProviderFactoryEventQueue } from './events/marketplace-provider-factory-events.queue';
import { MarketplaceProviderDependencyResolver } from './resolver/marketplace-provider-dependency.resolver';
import { MarketplaceProviderInstanceBuilder } from './builder/marketplace-provider-instance.builder';
import { MarketplaceProviderInitializationManager } from './initialization/marketplace-provider-initialization.manager';
import { MarketplaceProviderInstanceResolver } from './resolver/marketplace-provider-instance.resolver';
import { MarketplaceProviderFactoryService } from './marketplace-provider-factory.service';

@Module({
  imports: [
    MarketplaceProviderModule,
    MarketplaceProviderConfigModule,
    MarketplaceProviderCredentialsModule,
  ],
  providers: [
    // Infrastructure
    MarketplaceProviderInstanceCache,
    MarketplaceProviderFactoryValidator,
    MarketplaceProviderFactoryErrorNormalizer,
    MarketplaceProviderFactoryMetrics,
    MarketplaceProviderFactoryEventQueue,

    // Core pipeline
    MarketplaceProviderDependencyResolver,
    MarketplaceProviderInstanceBuilder,
    MarketplaceProviderInitializationManager,
    MarketplaceProviderInstanceResolver,

    // Public facade
    MarketplaceProviderFactoryService,
  ],
  exports: [
    MarketplaceProviderFactoryService,
    MarketplaceProviderInstanceCache,
    MarketplaceProviderFactoryMetrics,
    MarketplaceProviderFactoryValidator,
    MarketplaceProviderFactoryErrorNormalizer,
  ],
})
export class MarketplaceProviderFactoryModule {}
