import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { ReturnSyncRepository } from './repository/return-sync.repository';
import { ReturnSyncValidator } from './validator/return-sync.validator';
import { ReturnSyncStateManager } from './state/return-sync-state.manager';
import { ReturnSyncConflictResolver } from './conflict/return-sync-conflict.resolver';
import { ReturnSyncEventQueue } from './events/return-sync-events.queue';
import { ReturnSyncQueue } from './queue/return-sync.queue';
import { ReturnMapper } from './mapper/return-mapper';
import { ReturnPuller } from './puller/return-puller';
import { ReturnPusher } from './pusher/return-pusher';
import { ReturnSyncRunner } from './runner/return-sync.runner';
import { ReturnSyncScheduler } from './scheduler/return-sync.scheduler';
import { ReturnSyncMetrics } from './metrics/return-sync.metrics';
import { MarketplaceReturnSyncService } from './marketplace-return-sync.service';
import { MarketplaceReturnSyncController } from './marketplace-return-sync.controller';
import { ReturnSyncWorker } from './workers/return-sync.worker';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
  ],
  controllers: [MarketplaceReturnSyncController],
  providers: [
    ReturnSyncRepository,
    ReturnSyncValidator,
    ReturnSyncStateManager,
    ReturnSyncConflictResolver,
    ReturnSyncEventQueue,
    ReturnSyncQueue,
    ReturnMapper,
    ReturnPuller,
    ReturnPusher,
    ReturnSyncRunner,
    ReturnSyncScheduler,
    ReturnSyncMetrics,
    MarketplaceReturnSyncService,
    ReturnSyncWorker,
  ],
  exports: [
    MarketplaceReturnSyncService,
    ReturnSyncMetrics,
    ReturnSyncStateManager,
    ReturnSyncRepository,
  ],
})
export class MarketplaceReturnSyncModule {}
