import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdapterRegistry } from '../../registry/adapter.registry';
import { ShopifyAdapter } from './shopify.adapter';

@Injectable()
export class ShopifyAdapterInitializer implements OnModuleInit {
  private readonly logger = new Logger(ShopifyAdapterInitializer.name);

  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  onModuleInit() {
    this.adapterRegistry.register('shopify', ShopifyAdapter);
    this.logger.log('Shopify adapter registered successfully');
  }
}
