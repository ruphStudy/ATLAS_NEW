import { Module, OnModuleInit } from '@nestjs/common';
import { SupplierProviderModule } from '../../supplier-provider.module';
import { DatabaseModule } from '@database/database.module';
import { SupplierProviderRegistry } from '../../registry/supplier-provider.registry';
import { SupplierAdapterRegistry } from '../../adapters/supplier-adapter.registry';
import { AlibabaAdapter } from './alibaba/alibaba.adapter';

@Module({
  imports: [DatabaseModule, SupplierProviderModule],
  providers: [AlibabaAdapter],
  exports: [AlibabaAdapter],
})
export class AlibabaModule implements OnModuleInit {
  constructor(
    private readonly adapter: AlibabaAdapter,
    private readonly providerRegistry: SupplierProviderRegistry,
    private readonly adapterRegistry: SupplierAdapterRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.providerRegistry.isRegistered('ALIBABA')) {
      this.providerRegistry.register(this.adapter);
    }
    if (!this.adapterRegistry.isRegistered('ALIBABA')) {
      this.adapterRegistry.register(this.adapter);
    }
  }
}
