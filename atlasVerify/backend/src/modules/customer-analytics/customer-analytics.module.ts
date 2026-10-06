import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { CustomerAnalyticsController } from './customer-analytics.controller';
import { CustomerAnalyticsService } from './customer-analytics.service';
import { CustomerAnalyticsRepository } from './customer-analytics.repository';
import { CustomerAnalyticsEventQueue, CustomerAnalyticsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'customer-analytics-events',
    }),
  ],
  controllers: [CustomerAnalyticsController],
  providers: [
    CustomerAnalyticsService,
    CustomerAnalyticsRepository,
    CustomerAnalyticsEventQueue,
    CustomerAnalyticsEventWorker,
  ],
  exports: [CustomerAnalyticsService],
})
export class CustomerAnalyticsModule {}
