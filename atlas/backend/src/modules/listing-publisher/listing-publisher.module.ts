import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ListingPublisherController } from './listing-publisher.controller';
import { ListingPublisherService } from './listing-publisher.service';
import { ListingPublisherRepository } from './listing-publisher.repository';
import { MarketplaceAdapterEngine } from './engine/marketplace-adapter.engine';
import {
  PublicationEventQueue,
  PublishQueue,
  BulkPublishQueue,
  PublicationEventWorker,
  PublishWorker,
  BulkPublishWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [ListingPublisherController],
  providers: [
    ListingPublisherService,
    ListingPublisherRepository,
    MarketplaceAdapterEngine,
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
