import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '../../../marketplace-provider/registry/marketplace-provider.registry';
import { AmazonMarketplaceProviderAdapter } from './amazon-marketplace-provider.adapter';

/**
 * Registers the Amazon bridge adapter into MarketplaceProviderRegistry so that
 * MarketplaceProviderFactoryService.resolve({ providerKey: 'AMAZON' }) can find it.
 * Mirrors AmazonAdapterInitializer, which does the equivalent registration into
 * the separate marketplace-adapter AdapterRegistry.
 */
@Injectable()
export class AmazonMarketplaceProviderInitializer implements OnModuleInit {
  private readonly logger = new Logger(AmazonMarketplaceProviderInitializer.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly adapter: AmazonMarketplaceProviderAdapter,
  ) {}

  onModuleInit() {
    this.registry.register(this.adapter);
    this.logger.log('Amazon provider registered in MarketplaceProviderRegistry');
  }
}
