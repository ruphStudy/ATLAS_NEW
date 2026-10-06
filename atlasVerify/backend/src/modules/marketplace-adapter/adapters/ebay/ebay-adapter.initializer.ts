import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdapterRegistry } from '../../registry/adapter.registry';
import { EbayAdapter } from './ebay.adapter';

@Injectable()
export class EbayAdapterInitializer implements OnModuleInit {
  private readonly logger = new Logger(EbayAdapterInitializer.name);

  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  onModuleInit() {
    this.adapterRegistry.register('ebay', EbayAdapter);
    this.logger.log('eBay adapter registered successfully');
  }
}
