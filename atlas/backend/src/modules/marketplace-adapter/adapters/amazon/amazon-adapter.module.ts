import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../../common/constants';
import { MarketplaceAdapterModule } from '../../marketplace-adapter.module';
import { MarketplaceProviderModule } from '../../../marketplace-provider/marketplace-provider.module';
import { MarketplaceAccountModule } from '../../../marketplace-account/marketplace-account.module';
import { MarketplaceProviderCredentialsModule } from '../../../marketplace-provider-credentials/marketplace-provider-credentials.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { UsersModule } from '@modules/users/users.module';
import { AmazonAdapter } from './amazon.adapter';
import { AmazonAdapterFactory } from './amazon-adapter.factory';
import { AmazonAuthService } from './auth/amazon-auth.service';
import { AmazonSpApiClient } from './client/amazon-sp-api.client';
import { AmazonRequestMapper } from './mappers/amazon-request.mapper';
import { AmazonResponseMapper } from './mappers/amazon-response.mapper';
import { AmazonErrorMapper } from './mappers/amazon-error.mapper';
import { AmazonAdapterEventQueue } from './events/amazon-adapter-event.queue';
import { AmazonAdapterInitializer } from './amazon-adapter.initializer';
import { AmazonMarketplaceProviderAdapter } from './amazon-marketplace-provider.adapter';
import { AmazonMarketplaceProviderInitializer } from './amazon-marketplace-provider.initializer';
import { AmazonOAuthStateSigner } from './oauth/amazon-oauth-state.util';
import { AmazonOAuthService } from './oauth/amazon-oauth.service';
import { AmazonOAuthController } from './oauth/amazon-oauth.controller';
import { AmazonSandboxHealthService } from './health/amazon-sandbox-health.service';
import { AmazonSandboxHealthController } from './health/amazon-sandbox-health.controller';

@Module({
  imports: [
    MarketplaceAdapterModule,
    MarketplaceProviderModule,
    MarketplaceAccountModule,
    MarketplaceProviderCredentialsModule,
    TenantIsolationModule,
    UsersModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ADAPTER_EVENTS }),
  ],
  controllers: [AmazonOAuthController, AmazonSandboxHealthController],
  providers: [
    AmazonAdapter,
    AmazonAuthService,
    AmazonSpApiClient,
    AmazonRequestMapper,
    AmazonResponseMapper,
    AmazonErrorMapper,
    AmazonAdapterEventQueue,
    AmazonAdapterInitializer,
    AmazonMarketplaceProviderAdapter,
    AmazonMarketplaceProviderInitializer,
    AmazonOAuthStateSigner,
    AmazonOAuthService,
    AmazonSandboxHealthService,
    AmazonAdapterFactory,
  ],
  exports: [AmazonAdapter, AmazonMarketplaceProviderAdapter, AmazonOAuthService, AmazonAdapterFactory],
})
export class AmazonAdapterModule {}
