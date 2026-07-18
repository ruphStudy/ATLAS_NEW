import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { ListingRepository } from './listing.repository';
import { ListingQualityEngine } from './engine/listing-quality.engine';
import { ListingBuilderEngine } from './engine/listing-builder.engine';
import { MarketplaceListingEngine } from './engine/marketplace-listing.engine';
import {
  ListingEventQueue,
  ListingGenerationQueue,
  ListingEventWorker,
  ListingGenerationWorker,
  MarketplaceListingTransformQueue,
  MarketplaceListingTransformWorker,
} from './jobs';
import { MarketplaceListingMappingModule } from '@modules/marketplace-listing-mapping/marketplace-listing-mapping.module';

@Module({
  imports: [DatabaseModule, MarketplaceListingMappingModule],
  controllers: [ListingController],
  providers: [
    ListingService,
    ListingRepository,
    ListingQualityEngine,
    ListingBuilderEngine,
    MarketplaceListingEngine,
    ListingEventQueue,
    ListingGenerationQueue,
    ListingEventWorker,
    ListingGenerationWorker,
    MarketplaceListingTransformQueue,
    MarketplaceListingTransformWorker,
  ],
  exports: [ListingService, ListingQualityEngine, ListingBuilderEngine],
})
export class ListingModule {}
