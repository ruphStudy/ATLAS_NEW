import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { EbayAdapter } from './ebay.adapter';
import { EbayAuthService } from './auth/ebay-auth.service';
import { EbayApiClient } from './client/ebay-api.client';
import { EbayRequestMapper } from './mappers/ebay-request.mapper';
import { EbayResponseMapper } from './mappers/ebay-response.mapper';
import { EbayErrorMapper } from './mappers/ebay-error.mapper';
import { EbayAdapterEventQueue } from './events/ebay-adapter-event.queue';
import { EbayAdapterInitializer } from './ebay-adapter.initializer';

@Module({
  imports: [
    MarketplaceAdapterModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  providers: [
    EbayAdapter,
    EbayAuthService,
    EbayApiClient,
    EbayRequestMapper,
    EbayResponseMapper,
    EbayErrorMapper,
    EbayAdapterEventQueue,
    EbayAdapterInitializer,
  ],
  exports: [EbayAdapter],
})
export class EbayAdapterModule {}
