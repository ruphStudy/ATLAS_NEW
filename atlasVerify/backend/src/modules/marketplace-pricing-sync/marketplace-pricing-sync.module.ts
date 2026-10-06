import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { PriceSyncRepository } from './repository/price-sync.repository';
import { PriceSyncValidator } from './validator/price-sync.validator';
import { PriceSyncStateManager } from './state/price-sync-state.manager';
import { PriceSyncConflictResolver } from './conflict/price-sync-conflict.resolver';
import { PriceSyncEventQueue } from './events/price-sync-events.queue';
import { PriceSyncQueue } from './queue/price-sync.queue';
import { PriceMapper } from './mapper/price-mapper';
import { PricePuller } from './puller/price-puller';
import { PricePusher } from './pusher/price-pusher';
import { PriceSyncRunner } from './runner/price-sync.runner';
import { PriceSyncScheduler } from './scheduler/price-sync.scheduler';
import { PriceSyncMetrics } from './metrics/price-sync.metrics';
import { MarketplacePricingSyncService } from './marketplace-pricing-sync.service';
import { MarketplacePricingSyncController } from './marketplace-pricing-sync.controller';
import { PriceSyncWorker } from './workers/price-sync.worker';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
  ],
  controllers: [MarketplacePricingSyncController],
  providers: [
    PriceSyncRepository,
    PriceSyncValidator,
    PriceSyncStateManager,
    PriceSyncConflictResolver,
    PriceSyncEventQueue,
    PriceSyncQueue,
    PriceMapper,
    PricePuller,
    PricePusher,
    PriceSyncRunner,
    PriceSyncScheduler,
    PriceSyncMetrics,
    MarketplacePricingSyncService,
    PriceSyncWorker,
  ],
  exports: [
    MarketplacePricingSyncService,
    PriceSyncMetrics,
    PriceSyncStateManager,
    PriceSyncRepository,
  ],
})
export class MarketplacePricingSyncModule {}
