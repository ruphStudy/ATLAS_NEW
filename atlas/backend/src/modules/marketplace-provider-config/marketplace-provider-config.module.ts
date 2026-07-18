import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceProviderConfigRepository } from './marketplace-provider-config.repository';
import { MarketplaceProviderConfigValidator } from './validator/marketplace-provider-config.validator';
import { MarketplaceProviderConfigCache } from './cache/marketplace-provider-config.cache';
import { MarketplaceProviderConfigService } from './marketplace-provider-config.service';
import { MarketplaceProviderConfigManager } from './marketplace-provider-config.manager';
import { MarketplaceProviderConfigController } from './marketplace-provider-config.controller';
import { MarketplaceProviderConfigEventQueue } from './jobs/marketplace-provider-config-events.queue';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceProviderConfigController],
  providers: [
    MarketplaceProviderConfigRepository,
    MarketplaceProviderConfigValidator,
    MarketplaceProviderConfigCache,
    MarketplaceProviderConfigEventQueue,
    MarketplaceProviderConfigService,
    MarketplaceProviderConfigManager,
  ],
  exports: [
    MarketplaceProviderConfigService,
    MarketplaceProviderConfigManager,
    MarketplaceProviderConfigCache,
    MarketplaceProviderConfigValidator,
  ],
})
export class MarketplaceProviderConfigModule {}
