import { Module, OnModuleInit } from '@nestjs/common';
import { SupplierProviderModule } from '../../supplier-provider.module';
import { DatabaseModule } from '@database/database.module';
import { PrismaService } from '@database/prisma.service';
import { ProviderErrorNormalizer } from '../../errors/provider-error-normalizer';
import { SupplierProviderCredentialService } from '../../credentials/supplier-provider-credential.service';
import { SupplierProviderRegistry } from '../../registry/supplier-provider.registry';
import { AdapterCapabilityValidator } from '../../adapters/adapter-capability.validator';
import { AdapterIdempotencyService } from '../../adapters/adapter-idempotency.service';
import { AdapterRateLimitHandler } from '../../adapters/adapter-rate-limit.handler';
import { AdapterHealthChecker } from '../../adapters/adapter-health.checker';
import { AdapterMetricsRecorder } from '../../adapters/adapter-metrics.recorder';
import { AdapterAuditLogger } from '../../adapters/adapter-audit.logger';
import { SupplierAdapterRegistry } from '../../adapters/supplier-adapter.registry';
import { IndiaMartAdapter } from './indiamart/indiamart.adapter';

@Module({
  imports: [DatabaseModule, SupplierProviderModule],
  providers: [IndiaMartAdapter],
  exports: [IndiaMartAdapter],
})
export class IndiaMartModule implements OnModuleInit {
  constructor(
    private readonly adapter: IndiaMartAdapter,
    private readonly providerRegistry: SupplierProviderRegistry,
    private readonly adapterRegistry: SupplierAdapterRegistry,
  ) {}

  onModuleInit(): void {
    // Register in both registries as required by the architecture.
    if (!this.providerRegistry.isRegistered('INDIAMART')) {
      this.providerRegistry.register(this.adapter);
    }
    if (!this.adapterRegistry.isRegistered('INDIAMART')) {
      this.adapterRegistry.register(this.adapter);
    }
  }
}
