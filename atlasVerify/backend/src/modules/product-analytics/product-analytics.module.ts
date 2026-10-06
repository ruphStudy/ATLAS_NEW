import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { ProductAnalyticsController } from './product-analytics.controller';
import { ProductAnalyticsService } from './product-analytics.service';
import { ProductAnalyticsRepository } from './product-analytics.repository';
import { ProductAnalyticsEventQueue, ProductAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'product-analytics-events',
    }),
  ],
  controllers: [ProductAnalyticsController],
  providers: [
    ProductAnalyticsService,
    ProductAnalyticsRepository,
    ProductAnalyticsEventQueue,
    ProductAnalyticsEventWorker,
  ],
  exports: [ProductAnalyticsService],
})
export class ProductAnalyticsModule {}
