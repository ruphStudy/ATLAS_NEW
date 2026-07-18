import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SupplierProviderRegistry } from './registry/supplier-provider.registry';
import { SupplierProviderFactory } from './registry/supplier-provider.factory';
import { SupplierProviderCredentialService } from './credentials/supplier-provider-credential.service';
import { ProviderErrorNormalizer } from './errors/provider-error-normalizer';
import { SupplierProviderHealthMonitor } from './health/supplier-provider-health.monitor';
import { SupplierProviderManager } from './manager/supplier-provider.manager';
import { SupplierProviderService } from './supplier-provider.service';
import { SupplierProviderController } from './supplier-provider.controller';

// Adapter infrastructure
import { AdapterCapabilityValidator } from './adapters/adapter-capability.validator';
import { AdapterIdempotencyService } from './adapters/adapter-idempotency.service';
import { AdapterRateLimitHandler } from './adapters/adapter-rate-limit.handler';
import { AdapterHealthChecker } from './adapters/adapter-health.checker';
import { AdapterMetricsRecorder } from './adapters/adapter-metrics.recorder';
import { AdapterAuditLogger } from './adapters/adapter-audit.logger';
import { SupplierAdapterRegistry } from './adapters/supplier-adapter.registry';
import { SupplierAdapterFactoryIntegration } from './adapters/supplier-adapter-factory.integration';

const ADAPTER_INFRASTRUCTURE = [
  AdapterCapabilityValidator,
  AdapterIdempotencyService,
  AdapterRateLimitHandler,
  AdapterHealthChecker,
  AdapterMetricsRecorder,
  AdapterAuditLogger,
  SupplierAdapterRegistry,
  SupplierAdapterFactoryIntegration,
];

@Module({
  imports: [DatabaseModule],
  controllers: [SupplierProviderController],
  providers: [
    SupplierProviderRegistry,
    SupplierProviderFactory,
    SupplierProviderCredentialService,
    ProviderErrorNormalizer,
    SupplierProviderHealthMonitor,
    SupplierProviderManager,
    SupplierProviderService,
    ...ADAPTER_INFRASTRUCTURE,
  ],
  exports: [
    SupplierProviderRegistry,
    SupplierProviderFactory,
    SupplierProviderCredentialService,
    ProviderErrorNormalizer,
    SupplierProviderHealthMonitor,
    SupplierProviderManager,
    ...ADAPTER_INFRASTRUCTURE,
  ],
})
export class SupplierProviderModule {}
