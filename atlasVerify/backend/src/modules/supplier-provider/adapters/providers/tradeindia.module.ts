import { Module, OnModuleInit } from '@nestjs/common';
import { SupplierProviderModule } from '../../supplier-provider.module';
import { DatabaseModule } from '@database/database.module';
import { SupplierProviderRegistry } from '../../registry/supplier-provider.registry';
import { SupplierAdapterRegistry } from '../../adapters/supplier-adapter.registry';
import { TradeIndiaAdapter } from './tradeindia/tradeindia.adapter';

@Module({
  imports: [DatabaseModule, SupplierProviderModule],
  providers: [TradeIndiaAdapter],
  exports: [TradeIndiaAdapter],
})
export class TradeIndiaModule implements OnModuleInit {
  constructor(
    private readonly adapter: TradeIndiaAdapter,
    private readonly providerRegistry: SupplierProviderRegistry,
    private readonly adapterRegistry: SupplierAdapterRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.providerRegistry.isRegistered('TRADEINDIA')) {
      this.providerRegistry.register(this.adapter);
    }
    if (!this.adapterRegistry.isRegistered('TRADEINDIA')) {
      this.adapterRegistry.register(this.adapter);
    }
  }
}
