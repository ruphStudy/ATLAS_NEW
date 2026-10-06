import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/constants';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceQueueManagerController } from './marketplace-queue-manager.controller';
import { MarketplaceQueueManagerService } from './marketplace-queue-manager.service';
import { QueueManagerRepository } from './repository/queue-manager.repository';
import { QueueManager } from './manager/queue.manager';
import { JobManager } from './manager/job.manager';
import { QueueLifecycleEventQueue } from './events/queue-lifecycle-event.queue';
import { QueueMetricsService } from './metrics/queue-metrics.service';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MARKETPLACE_QUEUE_MANAGER_EVENTS },
      { name: QUEUE_NAMES.MARKETPLACE_CATALOG_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_INVENTORY_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_LISTING_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_ORDER_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_SHIPMENT_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_RETURN_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_PRICING_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_WEBHOOK_PROCESSING },
      { name: QUEUE_NAMES.MARKETPLACE_EVENT_PROCESSING },
    ),
  ],
  controllers: [MarketplaceQueueManagerController],
  providers: [
    MarketplaceQueueManagerService,
    QueueManagerRepository,
    QueueManager,
    JobManager,
    QueueLifecycleEventQueue,
    QueueMetricsService,
  ],
  exports: [
    MarketplaceQueueManagerService,
    QueueManager,
    JobManager,
    QueueManagerRepository,
  ],
})
export class MarketplaceQueueManagerModule {}
