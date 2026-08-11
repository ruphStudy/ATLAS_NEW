import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsCacheController } from './analytics-cache.controller';
import { AnalyticsCacheService } from './analytics-cache.service';
import { AnalyticsCacheRepository } from './analytics-cache.repository';
import { AnalyticsCacheEventQueue, AnalyticsCacheEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'analytics-cache-events',
    }),
  ],
  controllers: [AnalyticsCacheController],
  providers: [
    AnalyticsCacheService,
    AnalyticsCacheRepository,
    AnalyticsCacheEventQueue,
    AnalyticsCacheEventWorker,
  ],
  exports: [AnalyticsCacheService],
})
export class AnalyticsCacheModule {}
