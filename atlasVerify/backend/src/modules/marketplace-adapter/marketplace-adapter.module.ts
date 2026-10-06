import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceAdapterController } from './marketplace-adapter.controller';
import { MarketplaceAdapterService } from './marketplace-adapter.service';
import { AdapterRegistry } from './registry/adapter.registry';
import { AdapterFactory } from './factory/adapter.factory';
import { AdapterHttpClient } from './client/http.client';
import { ResponseNormalizer } from './normalizer/response.normalizer';
import { AdapterHealthChecker } from './health/adapter-health.checker';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceAdapterController],
  providers: [
    MarketplaceAdapterService,
    AdapterRegistry,
    AdapterFactory,
    AdapterHttpClient,
    ResponseNormalizer,
    AdapterHealthChecker,
  ],
  exports: [
    MarketplaceAdapterService,
    AdapterRegistry,
    AdapterFactory,
    AdapterHttpClient,
    ResponseNormalizer,
  ],
})
export class MarketplaceAdapterModule {}
