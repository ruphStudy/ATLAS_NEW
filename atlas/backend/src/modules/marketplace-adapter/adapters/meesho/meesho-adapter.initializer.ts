import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AdapterRegistry } from '../../registry/adapter.registry';
import { MeeshoAdapter } from './meesho.adapter';

@Injectable()
export class MeeshoAdapterInitializer implements OnModuleInit {
  private readonly logger = new Logger(MeeshoAdapterInitializer.name);

  constructor(private readonly adapterRegistry: AdapterRegistry) {}

  onModuleInit() {
    this.adapterRegistry.register('meesho', MeeshoAdapter);
    this.logger.log('Meesho adapter registered successfully');
  }
}
