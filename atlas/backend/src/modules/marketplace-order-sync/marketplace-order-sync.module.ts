import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { OrderSyncRepository } from './repository/order-sync.repository';
import { OrderSyncValidator } from './validator/order-sync.validator';
import { OrderSyncStateManager } from './state/order-sync-state.manager';
import { OrderSyncConflictResolver } from './conflict/order-sync-conflict.resolver';
import { OrderSyncEventQueue } from './events/order-sync-events.queue';
import { OrderSyncQueue } from './queue/order-sync.queue';
import { OrderMapper } from './mapper/order-mapper';
import { OrderPuller } from './puller/order-puller';
import { OrderSyncRunner } from './runner/order-sync.runner';
import { OrderSyncScheduler } from './scheduler/order-sync.scheduler';
import { OrderSyncMetrics } from './metrics/order-sync.metrics';
import { MarketplaceOrderSyncService } from './marketplace-order-sync.service';
import { MarketplaceOrderSyncController } from './marketplace-order-sync.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
  ],
  controllers: [MarketplaceOrderSyncController],
  providers: [
    OrderSyncRepository,
    OrderSyncValidator,
    OrderSyncStateManager,
    OrderSyncConflictResolver,
    OrderSyncEventQueue,
    OrderSyncQueue,
    OrderMapper,
    OrderPuller,
    OrderSyncRunner,
    OrderSyncScheduler,
    OrderSyncMetrics,
    MarketplaceOrderSyncService,
  ],
  exports: [
    MarketplaceOrderSyncService,
    OrderSyncMetrics,
    OrderSyncStateManager,
    OrderSyncRepository,
  ],
})
export class MarketplaceOrderSyncModule {}
