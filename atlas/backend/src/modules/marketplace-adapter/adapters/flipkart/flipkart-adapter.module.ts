import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { FlipkartAdapter } from './flipkart.adapter';
import { FlipkartAuthService } from './auth/flipkart-auth.service';
import { FlipkartApiClient } from './client/flipkart-api.client';
import { FlipkartRequestMapper } from './mappers/flipkart-request.mapper';
import { FlipkartResponseMapper } from './mappers/flipkart-response.mapper';
import { FlipkartErrorMapper } from './mappers/flipkart-error.mapper';
import { FlipkartAdapterEventQueue } from './events/flipkart-adapter-event.queue';
import { FlipkartAdapterInitializer } from './flipkart-adapter.initializer';

@Module({
  imports: [
    MarketplaceAdapterModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  providers: [
    FlipkartAdapter,
    FlipkartAuthService,
    FlipkartApiClient,
    FlipkartRequestMapper,
    FlipkartResponseMapper,
    FlipkartErrorMapper,
    FlipkartAdapterEventQueue,
    FlipkartAdapterInitializer,
  ],
  exports: [FlipkartAdapter],
})
export class FlipkartAdapterModule {}
