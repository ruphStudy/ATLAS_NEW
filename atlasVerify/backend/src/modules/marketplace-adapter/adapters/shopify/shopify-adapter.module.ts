import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { ShopifyAdapter } from './shopify.adapter';
import { ShopifyAuthService } from './auth/shopify-auth.service';
import { ShopifyGraphQLClient } from './client/shopify-graphql.client';
import { ShopifyRequestMapper } from './mappers/shopify-request.mapper';
import { ShopifyResponseMapper } from './mappers/shopify-response.mapper';
import { ShopifyErrorMapper } from './mappers/shopify-error.mapper';
import { ShopifyAdapterEventQueue } from './events/shopify-adapter-event.queue';
import { ShopifyAdapterInitializer } from './shopify-adapter.initializer';

@Module({
  imports: [
    MarketplaceAdapterModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  providers: [
    ShopifyAdapter,
    ShopifyAuthService,
    ShopifyGraphQLClient,
    ShopifyRequestMapper,
    ShopifyResponseMapper,
    ShopifyErrorMapper,
    ShopifyAdapterEventQueue,
    ShopifyAdapterInitializer,
  ],
  exports: [ShopifyAdapter],
})
export class ShopifyAdapterModule {}
