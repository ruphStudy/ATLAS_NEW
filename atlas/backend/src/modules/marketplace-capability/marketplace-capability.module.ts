import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderConfigModule } from '../marketplace-provider-config/marketplace-provider-config.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { MarketplaceCapabilityRepository } from './repository/marketplace-capability.repository';
import { MarketplaceCapabilityRegistry } from './registry/marketplace-capability.registry';
import { MarketplaceCapabilityCache } from './cache/marketplace-capability.cache';
import { MarketplaceCapabilityValidator } from './validator/marketplace-capability.validator';
import { MarketplaceCapabilityMetrics } from './metrics/marketplace-capability.metrics';
import { MarketplaceCapabilityAudit } from './audit/marketplace-capability.audit';
import { MarketplaceCapabilityEventQueue } from './events/marketplace-capability-events.queue';
import { MarketplaceCapabilityVersionManager } from './version/marketplace-capability-version.manager';
import { MarketplaceCapabilityCompatibilityManager } from './compatibility/marketplace-capability-compatibility.manager';
import { MarketplaceCapabilityResolver } from './resolver/marketplace-capability.resolver';
import { MarketplaceCapabilityMatrixBuilder } from './matrix/marketplace-capability-matrix.builder';
import { MarketplaceCapabilityService } from './marketplace-capability.service';
import { MarketplaceCapabilityManager } from './manager/marketplace-capability.manager';
import { MarketplaceCapabilityController } from './marketplace-capability.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderConfigModule,
    MarketplaceProviderFactoryModule,
  ],
  controllers: [MarketplaceCapabilityController],
  providers: [
    // Infrastructure
    MarketplaceCapabilityRepository,
    MarketplaceCapabilityRegistry,
    MarketplaceCapabilityCache,
    MarketplaceCapabilityValidator,
    MarketplaceCapabilityMetrics,
    MarketplaceCapabilityAudit,
    MarketplaceCapabilityEventQueue,

    // Domain logic
    MarketplaceCapabilityVersionManager,
    MarketplaceCapabilityCompatibilityManager,
    MarketplaceCapabilityResolver,
    MarketplaceCapabilityMatrixBuilder,

    // Public facades
    MarketplaceCapabilityService,
    MarketplaceCapabilityManager,
  ],
  exports: [
    MarketplaceCapabilityService,
    MarketplaceCapabilityManager,
    MarketplaceCapabilityRegistry,
    MarketplaceCapabilityCache,
    MarketplaceCapabilityValidator,
    MarketplaceCapabilityMetrics,
    MarketplaceCapabilityCompatibilityManager,
    MarketplaceCapabilityVersionManager,
  ],
})
export class MarketplaceCapabilityModule {}
