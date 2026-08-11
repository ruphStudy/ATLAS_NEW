import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { WalmartAdapter } from './walmart.adapter';
import { WalmartAuthService } from './auth/walmart-auth.service';
import { WalmartApiClient } from './client/walmart-api.client';
import { WalmartRequestMapper } from './mappers/walmart-request.mapper';
import { WalmartResponseMapper } from './mappers/walmart-response.mapper';
import { WalmartErrorMapper } from './mappers/walmart-error.mapper';
import { WalmartAdapterEventQueue } from './events/walmart-adapter-event.queue';
import { WalmartAdapterInitializer } from './walmart-adapter.initializer';

@Module({
  imports: [
    MarketplaceAdapterModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  providers: [
    WalmartAdapter,
    WalmartAuthService,
    WalmartApiClient,
    WalmartRequestMapper,
    WalmartResponseMapper,
    WalmartErrorMapper,
    WalmartAdapterEventQueue,
    WalmartAdapterInitializer,
  ],
  exports: [WalmartAdapter],
})
export class WalmartAdapterModule {}
