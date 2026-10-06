import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ListingPublisherController } from './listing-publisher.controller';
import { ListingPublisherService } from './listing-publisher.service';
import { ListingPublisherRepository } from './listing-publisher.repository';
import { MarketplaceAdapterEngine } from './engine/marketplace-adapter.engine';
import { MarketplaceAccountResolver } from './marketplace-account-resolver.service';
import {
  PublicationEventQueue,
  PublishQueue,
  BulkPublishQueue,
  PublicationEventWorker,
  PublishWorker,
  BulkPublishWorker,
} from './jobs';
import { MarketplaceAccountModule } from '../marketplace-account/marketplace-account.module';
import { AmazonAdapterModule } from '../marketplace-adapter/adapters/amazon/amazon-adapter.module';
import { ListingModule } from '../listing/listing.module';

@Module({
  imports: [DatabaseModule, MarketplaceAccountModule, AmazonAdapterModule, ListingModule],
  controllers: [ListingPublisherController],
  providers: [
    ListingPublisherService,
    ListingPublisherRepository,
    MarketplaceAdapterEngine,
    MarketplaceAccountResolver,
    PublicationEventQueue,
    PublishQueue,
    BulkPublishQueue,
    PublicationEventWorker,
    PublishWorker,
    BulkPublishWorker,
  ],
  exports: [ListingPublisherService],
})
export class ListingPublisherModule {}
