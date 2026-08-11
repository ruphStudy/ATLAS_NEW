import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';
import { PackingRepository } from './packing.repository';
import { PackingEventQueue, PackingEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'packing-events',
    }),
  ],
  controllers: [PackingController],
  providers: [PackingService, PackingRepository, PackingEventQueue, PackingEventWorker],
  exports: [PackingService, PackingRepository],
})
export class PackingModule {}
