import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';

import { MarketplaceProviderRegistry } from './registry/marketplace-provider.registry';
import { MarketplaceProviderFactory } from './registry/marketplace-provider.factory';
import { MarketplaceProviderResolver } from './registry/marketplace-provider.resolver';
import { MarketplaceCredentialService } from './credentials/marketplace-credential.service';
import { MarketplaceHealthMonitor } from './health/marketplace-health.monitor';
import { MarketplaceErrorNormalizer } from './errors/marketplace-error-normalizer';
import { MarketplaceCapabilityValidator } from './capability/marketplace-capability.validator';
import { MarketplaceVersionManager } from './version/marketplace-version.manager';
import { MarketplaceMetricsRecorder } from './metrics/marketplace-metrics.recorder';
import { MarketplaceProviderManager } from './manager/marketplace-provider.manager';
import { MarketplaceProviderRepository } from './marketplace-provider.repository';
import { MarketplaceProviderService } from './marketplace-provider.service';
import { MarketplaceProviderController } from './marketplace-provider.controller';
import {
  MarketplaceHealthCheckQueue,
  MarketplaceHealthCheckWorker,
  MarketplaceProviderEventQueue,
} from './jobs';

@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [MarketplaceProviderController],
  providers: [
    // Registry & Resolution
    MarketplaceProviderRegistry,
    MarketplaceProviderFactory,
    MarketplaceProviderResolver,

    // Core Services
    MarketplaceCredentialService,
    MarketplaceHealthMonitor,
    MarketplaceErrorNormalizer,
    MarketplaceCapabilityValidator,
    MarketplaceVersionManager,
    MarketplaceMetricsRecorder,

    // Manager (facade for business modules)
    MarketplaceProviderManager,

    // Data
    MarketplaceProviderRepository,

    // Application Service + Controller
    MarketplaceProviderService,

    // Jobs
    MarketplaceHealthCheckQueue,
    MarketplaceHealthCheckWorker,
    MarketplaceProviderEventQueue,
  ],
  exports: [
    // Public API for other modules
    MarketplaceProviderRegistry,
    MarketplaceProviderFactory,
    MarketplaceProviderResolver,
    MarketplaceProviderManager,
    MarketplaceCredentialService,
    MarketplaceHealthMonitor,
    MarketplaceErrorNormalizer,
    MarketplaceCapabilityValidator,
    MarketplaceVersionManager,
    MarketplaceMetricsRecorder,
    MarketplaceProviderService,
  ],
})
export class MarketplaceProviderModule {}
