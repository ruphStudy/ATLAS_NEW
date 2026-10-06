import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { PickingController } from './picking.controller';
import { PickingService } from './picking.service';
import { PickingRepository } from './picking.repository';
import { PickingEventQueue, PickingEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'picking-events',
    }),
  ],
  controllers: [PickingController],
  providers: [PickingService, PickingRepository, PickingEventQueue, PickingEventWorker],
  exports: [PickingService, PickingRepository],
})
export class PickingModule {}
