import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { BusinessInsightsController } from './business-insights.controller';
import { BusinessInsightsService } from './business-insights.service';
import { BusinessInsightsRepository } from './business-insights.repository';
import { BusinessInsightsEventQueue, BusinessInsightsEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'business-insights-events',
    }),
  ],
  controllers: [BusinessInsightsController],
  providers: [
    BusinessInsightsService,
    BusinessInsightsRepository,
    BusinessInsightsEventQueue,
    BusinessInsightsEventWorker,
  ],
  exports: [BusinessInsightsService],
})
export class BusinessInsightsModule {}
