import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { ForecastingEngineController } from './forecasting-engine.controller';
import { ForecastingEngineService } from './forecasting-engine.service';
import { ForecastingEngineRepository } from './forecasting-engine.repository';
import { ForecastingEventQueue, ForecastingEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'forecasting-events',
    }),
  ],
  controllers: [ForecastingEngineController],
  providers: [
    ForecastingEngineService,
    ForecastingEngineRepository,
    ForecastingEventQueue,
    ForecastingEventWorker,
  ],
  exports: [ForecastingEngineService],
})
export class ForecastingEngineModule {}
