import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdapterRegistry } from '../../registry/adapter.registry';
import { AmazonAdapter } from './amazon.adapter';

@Injectable()
export class AmazonAdapterInitializer implements OnModuleInit {
  private readonly logger = new Logger(AmazonAdapterInitializer.name);

  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  onModuleInit() {
    this.adapterRegistry.register('amazon', AmazonAdapter);
    this.logger.log('Amazon adapter registered successfully');
  }
}
