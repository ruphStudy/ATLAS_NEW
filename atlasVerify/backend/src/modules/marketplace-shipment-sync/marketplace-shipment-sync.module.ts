import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { ShipmentSyncRepository } from './repository/shipment-sync.repository';
import { ShipmentSyncValidator } from './validator/shipment-sync.validator';
import { ShipmentSyncStateManager } from './state/shipment-sync-state.manager';
import { ShipmentSyncConflictResolver } from './conflict/shipment-sync-conflict.resolver';
import { ShipmentSyncEventQueue } from './events/shipment-sync-events.queue';
import { ShipmentSyncQueue } from './queue/shipment-sync.queue';
import { ShipmentMapper } from './mapper/shipment-mapper';
import { ShipmentPuller } from './puller/shipment-puller';
import { ShipmentPusher } from './pusher/shipment-pusher';
import { ShipmentSyncRunner } from './runner/shipment-sync.runner';
import { ShipmentSyncScheduler } from './scheduler/shipment-sync.scheduler';
import { ShipmentSyncMetrics } from './metrics/shipment-sync.metrics';
import { MarketplaceShipmentSyncService } from './marketplace-shipment-sync.service';
import { MarketplaceShipmentSyncController } from './marketplace-shipment-sync.controller';
import { ShipmentSyncWorker } from './workers/shipment-sync.worker';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
  ],
  controllers: [MarketplaceShipmentSyncController],
  providers: [
    ShipmentSyncRepository,
    ShipmentSyncValidator,
    ShipmentSyncStateManager,
    ShipmentSyncConflictResolver,
    ShipmentSyncEventQueue,
    ShipmentSyncQueue,
    ShipmentMapper,
    ShipmentPuller,
    ShipmentPusher,
    ShipmentSyncRunner,
    ShipmentSyncScheduler,
    ShipmentSyncMetrics,
    MarketplaceShipmentSyncService,
    ShipmentSyncWorker,
  ],
  exports: [
    MarketplaceShipmentSyncService,
    ShipmentSyncMetrics,
    ShipmentSyncStateManager,
    ShipmentSyncRepository,
  ],
})
export class MarketplaceShipmentSyncModule {}
