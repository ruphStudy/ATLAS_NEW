import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { WarehouseAnalyticsController } from './warehouse-analytics.controller';
import { WarehouseAnalyticsService } from './warehouse-analytics.service';
import { WarehouseAnalyticsRepository } from './warehouse-analytics.repository';
import { WarehouseAnalyticsEventQueue, WarehouseAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'warehouse-analytics-events',
    }),
  ],
  controllers: [WarehouseAnalyticsController],
  providers: [
    WarehouseAnalyticsService,
    WarehouseAnalyticsRepository,
    WarehouseAnalyticsEventQueue,
    WarehouseAnalyticsEventWorker,
  ],
  exports: [WarehouseAnalyticsService],
})
export class WarehouseAnalyticsModule {}
