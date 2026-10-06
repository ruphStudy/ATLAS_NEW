import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { PutawayController } from './putaway.controller';
import { PutawayService } from './putaway.service';
import { PutawayRepository } from './putaway.repository';
import { PutawayEventQueue, PutawayEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'putaway-events',
    }),
  ],
  controllers: [PutawayController],
  providers: [PutawayService, PutawayRepository, PutawayEventQueue, PutawayEventWorker],
  exports: [PutawayService, PutawayRepository],
})
export class PutawayModule {}
