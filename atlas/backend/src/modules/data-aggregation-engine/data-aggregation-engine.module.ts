import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DataAggregationEngineController } from './data-aggregation-engine.controller';
import { DataAggregationEngineService } from './data-aggregation-engine.service';
import { DataAggregationEngineRepository } from './data-aggregation-engine.repository';
import { DataAggregationEventQueue, DataAggregationEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'data-aggregation-events',
    }),
  ],
  controllers: [DataAggregationEngineController],
  providers: [
    DataAggregationEngineService,
    DataAggregationEngineRepository,
    DataAggregationEventQueue,
    DataAggregationEventWorker,
  ],
  exports: [DataAggregationEngineService],
})
export class DataAggregationEngineModule {}
