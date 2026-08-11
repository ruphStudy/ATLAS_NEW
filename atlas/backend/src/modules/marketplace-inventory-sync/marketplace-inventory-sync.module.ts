import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { InventorySyncRepository } from './repository/inventory-sync.repository';
import { InventorySyncValidator } from './validator/inventory-sync.validator';
import { InventorySyncStateManager } from './state/inventory-sync-state.manager';
import { InventorySyncConflictResolver } from './conflict/inventory-sync-conflict.resolver';
import { InventorySyncEventQueue } from './events/inventory-sync-events.queue';
import { InventorySyncQueue } from './queue/inventory-sync.queue';
import { InventoryMapper } from './mapper/inventory-mapper';
import { InventoryPuller } from './puller/inventory-puller';
import { InventoryPusher } from './pusher/inventory-pusher';
import { InventoryAdjustmentSyncer } from './adjustment/inventory-adjustment.syncer';
import { InventoryReconciler } from './reconciler/inventory-reconciler';
import { InventorySyncRunner } from './runner/inventory-sync.runner';
import { InventorySyncScheduler } from './scheduler/inventory-sync.scheduler';
import { InventorySyncMetrics } from './metrics/inventory-sync.metrics';
import { MarketplaceInventorySyncService } from './marketplace-inventory-sync.service';
import { MarketplaceInventorySyncController } from './marketplace-inventory-sync.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
  ],
  controllers: [MarketplaceInventorySyncController],
  providers: [
    InventorySyncRepository,
    InventorySyncValidator,
    InventorySyncStateManager,
    InventorySyncConflictResolver,
    InventorySyncEventQueue,
    InventorySyncQueue,
    InventoryMapper,
    InventoryPuller,
    InventoryPusher,
    InventoryAdjustmentSyncer,
    InventoryReconciler,
    InventorySyncRunner,
    InventorySyncScheduler,
    InventorySyncMetrics,
    MarketplaceInventorySyncService,
  ],
  exports: [
    MarketplaceInventorySyncService,
    InventorySyncMetrics,
    InventorySyncStateManager,
    InventorySyncRepository,
  ],
})
export class MarketplaceInventorySyncModule {}
