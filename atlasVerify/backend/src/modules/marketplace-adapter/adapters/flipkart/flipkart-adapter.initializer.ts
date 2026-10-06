import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdapterRegistry } from '../../registry/adapter.registry';
import { FlipkartAdapter } from './flipkart.adapter';

@Injectable()
export class FlipkartAdapterInitializer implements OnModuleInit {
  private readonly logger = new Logger(FlipkartAdapterInitializer.name);

  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  onModuleInit() {
    this.adapterRegistry.register('flipkart', FlipkartAdapter);
    this.logger.log('Flipkart adapter registered successfully');
  }
}
