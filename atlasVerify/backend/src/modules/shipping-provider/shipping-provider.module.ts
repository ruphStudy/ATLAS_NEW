import { Module } from '@nestjs/common';
import { ShippingProviderRegistry } from './registry/shipping-provider.registry';
import { ShippingProviderFactory } from './registry/shipping-provider.factory';
import { ShippingProviderCredentialService } from './credentials/shipping-provider-credential.service';
import { ShippingProviderErrorNormalizer } from './errors/shipping-provider-error-normalizer';
import { ShippingProviderHealthMonitor } from './health/shipping-provider-health.monitor';
import { ShippingProviderService } from './shipping-provider.service';
import { ShippingProviderController } from './shipping-provider.controller';

/**
 * ShippingProviderModule — the foundation for shipping/courier
 * integrations, mirroring the existing Marketplace Provider Foundation
 * and Supplier Provider Foundation: a generic, string-keyed registry +
 * adapter contract. No courier is named or hardcoded anywhere in this
 * module — adding a new courier means registering a new
 * `IShippingProviderAdapter`, nothing here changes.
 */
@Module({
  controllers: [ShippingProviderController],
  providers: [
    ShippingProviderRegistry,
    ShippingProviderFactory,
    ShippingProviderCredentialService,
    ShippingProviderErrorNormalizer,
    ShippingProviderHealthMonitor,
    ShippingProviderService,
  ],
  exports: [
    ShippingProviderRegistry,
    ShippingProviderFactory,
    ShippingProviderCredentialService,
    ShippingProviderErrorNormalizer,
    ShippingProviderHealthMonitor,
    ShippingProviderService,
  ],
})
export class ShippingProviderModule {}
