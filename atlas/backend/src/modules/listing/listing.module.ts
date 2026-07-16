import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller';
import { ListingService } from './listing.service';
import { ListingRepository } from './listing.repository';

/**
 * ListingModule
 *
 * Responsibilities:
 *   - Marketplace listing management
 *   - Listing content (title, bullets, description, images)
 *   - Listing status tracking
 *   - AI-generated content storage
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [ListingController],
  providers: [ListingService, ListingRepository],
  exports: [ListingService],
})
export class ListingModule {}
