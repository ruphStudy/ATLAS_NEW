import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { InventoryAnalyticsController } from './inventory-analytics.controller';
import { InventoryAnalyticsService } from './inventory-analytics.service';
import { InventoryAnalyticsRepository } from './inventory-analytics.repository';
import {
  InventoryAnalyticsEventQueue,
  InventoryAnalyticsEventWorker,
} from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'inventory-analytics-events',
    }),
  ],
  controllers: [InventoryAnalyticsController],
  providers: [
    InventoryAnalyticsService,
    InventoryAnalyticsRepository,
    InventoryAnalyticsEventQueue,
    InventoryAnalyticsEventWorker,
  ],
  exports: [InventoryAnalyticsService, InventoryAnalyticsRepository],
})
export class InventoryAnalyticsModule {}
