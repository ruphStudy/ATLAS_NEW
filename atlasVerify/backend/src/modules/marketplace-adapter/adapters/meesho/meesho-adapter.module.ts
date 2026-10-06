import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { MeeshoAdapter } from './meesho.adapter';
import { MeeshoAuthService } from './auth/meesho-auth.service';
import { MeeshoApiClient } from './client/meesho-api.client';
import { MeeshoRequestMapper } from './mappers/meesho-request.mapper';
import { MeeshoResponseMapper } from './mappers/meesho-response.mapper';
import { MeeshoErrorMapper } from './mappers/meesho-error.mapper';
import { MeeshoAdapterEventQueue } from './events/meesho-adapter-event.queue';
import { MeeshoAdapterInitializer } from './meesho-adapter.initializer';

@Module({
  imports: [
    MarketplaceAdapterModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  providers: [
    MeeshoAdapter,
    MeeshoAuthService,
    MeeshoApiClient,
    MeeshoRequestMapper,
    MeeshoResponseMapper,
    MeeshoErrorMapper,
    MeeshoAdapterEventQueue,
    MeeshoAdapterInitializer,
  ],
  exports: [MeeshoAdapter],
})
export class MeeshoAdapterModule {}
