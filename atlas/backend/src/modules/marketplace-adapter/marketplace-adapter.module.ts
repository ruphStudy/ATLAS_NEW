import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceAdapterController } from './marketplace-adapter.controller';
import { MarketplaceAdapterService } from './marketplace-adapter.service';
import { AdapterRegistry } from './registry/adapter.registry';
import { AdapterFactory } from './factory/adapter.factory';
import { AdapterHttpClient } from './client/http.client';
import { ResponseNormalizer } from './normalizer/response.normalizer';
import { AdapterHealthChecker } from './health/adapter-health.checker';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
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
