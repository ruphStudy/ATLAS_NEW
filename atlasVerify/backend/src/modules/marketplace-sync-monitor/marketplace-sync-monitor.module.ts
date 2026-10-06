import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/constants';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceSyncMonitorController } from './marketplace-sync-monitor.controller';
import { MarketplaceSyncMonitorService } from './marketplace-sync-monitor.service';
import { SyncMonitorRepository } from './repository/sync-monitor.repository';
import { SyncAggregator } from './aggregator/sync-aggregator';
import { SyncIssueDetector } from './detector/sync-issue-detector';
import { SyncMonitorLifecycleQueue } from './events/sync-monitor-lifecycle.queue';
import { SyncMonitorMetrics } from './metrics/sync-monitor.metrics';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MARKETPLACE_SYNC_MONITOR_EVENTS },
      { name: QUEUE_NAMES.MARKETPLACE_CATALOG_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_INVENTORY_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_LISTING_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_ORDER_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_SHIPMENT_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_RETURN_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_PRICING_SYNC_JOBS },
      { name: QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_JOBS },
    ),
  ],
  controllers: [MarketplaceSyncMonitorController],
  providers: [
    MarketplaceSyncMonitorService,
    SyncMonitorRepository,
    SyncAggregator,
    SyncIssueDetector,
    SyncMonitorLifecycleQueue,
    SyncMonitorMetrics,
  ],
  exports: [
    MarketplaceSyncMonitorService,
    SyncMonitorRepository,
    SyncAggregator,
    SyncIssueDetector,
  ],
})
export class MarketplaceSyncMonitorModule {}
