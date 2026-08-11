import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';
import { MarketplaceListingMappingModule } from '../marketplace-listing-mapping/marketplace-listing-mapping.module';

import { ListingSyncRepository } from './repository/listing-sync.repository';
import { ListingSyncValidator } from './validator/listing-sync.validator';
import { ListingSyncStateManager } from './state/listing-sync-state.manager';
import { ListingSyncConflictResolver } from './conflict/listing-sync-conflict.resolver';
import { ListingSyncEventQueue } from './events/listing-sync-events.queue';
import { ListingSyncQueue } from './queue/listing-sync.queue';
import { ListingMapper } from './mapper/listing-mapper';
import { ListingPuller } from './puller/listing-puller';
import { ListingPusher } from './pusher/listing-pusher';
import { ListingSyncRunner } from './runner/listing-sync.runner';
import { ListingSyncScheduler } from './scheduler/listing-sync.scheduler';
import { ListingSyncMetrics } from './metrics/listing-sync.metrics';
import { MarketplaceListingSyncService } from './marketplace-listing-sync.service';
import { MarketplaceListingSyncController } from './marketplace-listing-sync.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
    MarketplaceListingMappingModule,
  ],
  controllers: [MarketplaceListingSyncController],
  providers: [
    ListingSyncRepository,
    ListingSyncValidator,
    ListingSyncStateManager,
    ListingSyncConflictResolver,
    ListingSyncEventQueue,
    ListingSyncQueue,
    ListingMapper,
    ListingPuller,
    ListingPusher,
    ListingSyncRunner,
    ListingSyncScheduler,
    ListingSyncMetrics,
    MarketplaceListingSyncService,
  ],
  exports: [
    MarketplaceListingSyncService,
    ListingSyncMetrics,
    ListingSyncStateManager,
    ListingSyncRepository,
  ],
})
export class MarketplaceListingSyncModule {}
