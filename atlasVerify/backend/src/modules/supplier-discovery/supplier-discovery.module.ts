import { Module } from '@nestjs/common';
import {
  SuppliersController,
  SupplierDiscoveryController,
} from './supplier-discovery.controller';
import { SupplierDiscoveryService } from './supplier-discovery.service';
import { SupplierDiscoveryRepository } from './supplier-discovery.repository';
import { SupplierDiscoveryQueue } from './jobs/supplier-discovery.queue';
import { SupplierDiscoveryProcessor } from './jobs/supplier-discovery.processor';
import { IndiaMartProvider } from './providers/indiamart/indiamart.provider';
import { TradeIndiaProvider } from './providers/tradeindia/tradeindia.provider';
import { AlibabaProvider } from './providers/alibaba/alibaba.provider';
import { SupplierProviderRegistry } from './providers/provider.registry';

@Module({
  controllers: [SuppliersController, SupplierDiscoveryController],
  providers: [
    // Core
    SupplierDiscoveryService,
    SupplierDiscoveryRepository,

    // Queue + Worker
    SupplierDiscoveryQueue,
    SupplierDiscoveryProcessor,

    // Providers
    IndiaMartProvider,
    TradeIndiaProvider,
    AlibabaProvider,

    // Registry factory: add future providers here — zero changes elsewhere
    {
      provide: SupplierProviderRegistry,
      useFactory: (
        indiamart: IndiaMartProvider,
        tradeindia: TradeIndiaProvider,
        alibaba: AlibabaProvider,
      ) => new SupplierProviderRegistry([indiamart, tradeindia, alibaba]),
      inject: [IndiaMartProvider, TradeIndiaProvider, AlibabaProvider],
    },
  ],
  exports: [SupplierDiscoveryService],
})
export class SupplierDiscoveryModule {}
