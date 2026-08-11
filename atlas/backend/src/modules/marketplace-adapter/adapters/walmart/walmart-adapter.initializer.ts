import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdapterRegistry } from '../../registry/adapter.registry';
import { WalmartAdapter } from './walmart.adapter';

@Injectable()
export class WalmartAdapterInitializer implements OnModuleInit {
  private readonly logger = new Logger(WalmartAdapterInitializer.name);

  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  onModuleInit() {
    this.adapterRegistry.register('walmart', WalmartAdapter);
    this.logger.log('Walmart adapter registered successfully');
  }
}
