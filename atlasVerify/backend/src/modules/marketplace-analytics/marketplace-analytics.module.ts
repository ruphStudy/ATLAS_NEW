import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceAnalyticsController } from './marketplace-analytics.controller';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';
import { MarketplaceAnalyticsRepository } from './marketplace-analytics.repository';
import { MarketplaceAnalyticsEventQueue, MarketplaceAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'marketplace-analytics-events',
    }),
  ],
  controllers: [MarketplaceAnalyticsController],
  providers: [
    MarketplaceAnalyticsService,
    MarketplaceAnalyticsRepository,
    MarketplaceAnalyticsEventQueue,
    MarketplaceAnalyticsEventWorker,
  ],
  exports: [MarketplaceAnalyticsService],
})
export class MarketplaceAnalyticsModule {}
