import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceProviderFactoryModule } from '../marketplace-provider-factory/marketplace-provider-factory.module';

import { ReportSyncRepository } from './repository/report-sync.repository';
import { ReportSyncValidator } from './validator/report-sync.validator';
import { ReportSyncStateManager } from './state/report-sync-state.manager';
import { ReportSyncEventQueue } from './events/report-sync-events.queue';
import { ReportSyncQueue } from './queue/report-sync.queue';
import { ReportMapper } from './mapper/report-mapper';
import { ReportParser } from './parser/report-parser';
import { ReportPuller } from './puller/report-puller';
import { ReportSyncRunner } from './runner/report-sync.runner';
import { ReportSyncScheduler } from './scheduler/report-sync.scheduler';
import { ReportSyncMetrics } from './metrics/report-sync.metrics';
import { MarketplaceReportSyncService } from './marketplace-report-sync.service';
import { MarketplaceReportSyncController } from './marketplace-report-sync.controller';
import { ReportSyncWorker } from './workers/report-sync.worker';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceProviderFactoryModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_EVENTS },
      { name: QUEUE_NAMES.MARKETPLACE_REPORT_SYNC_JOBS },
    ),
  ],
  controllers: [MarketplaceReportSyncController],
  providers: [
    ReportSyncRepository,
    ReportSyncValidator,
    ReportSyncStateManager,
    ReportSyncEventQueue,
    ReportSyncQueue,
    ReportMapper,
    ReportParser,
    ReportPuller,
    ReportSyncRunner,
    ReportSyncScheduler,
    ReportSyncMetrics,
    MarketplaceReportSyncService,
    ReportSyncWorker,
  ],
  exports: [
    MarketplaceReportSyncService,
    ReportSyncMetrics,
    ReportSyncStateManager,
    ReportSyncRepository,
  ],
})
export class MarketplaceReportSyncModule {}
