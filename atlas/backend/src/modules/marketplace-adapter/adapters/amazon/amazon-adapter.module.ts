import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { AmazonAdapter } from './amazon.adapter';
import { AmazonAuthService } from './auth/amazon-auth.service';
import { AmazonSpApiClient } from './client/amazon-sp-api.client';
import { AmazonRequestMapper } from './mappers/amazon-request.mapper';
import { AmazonResponseMapper } from './mappers/amazon-response.mapper';
import { AmazonErrorMapper } from './mappers/amazon-error.mapper';
import { AmazonAdapterEventQueue } from './events/amazon-adapter-event.queue';
import { AmazonAdapterInitializer } from './amazon-adapter.initializer';

@Module({
  imports: [
    MarketplaceAdapterModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  providers: [
    AmazonAdapter,
    AmazonAuthService,
    AmazonSpApiClient,
    AmazonRequestMapper,
    AmazonResponseMapper,
    AmazonErrorMapper,
    AmazonAdapterEventQueue,
    AmazonAdapterInitializer,
  ],
  exports: [AmazonAdapter],
})
export class AmazonAdapterModule {}
