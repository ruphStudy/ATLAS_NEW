import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { ReceivingController } from './receiving.controller';
import { ReceivingService } from './receiving.service';
import { ReceivingRepository } from './receiving.repository';
import { ReceivingEventQueue, ReceivingEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'receiving-events',
    }),
  ],
  controllers: [ReceivingController],
  providers: [ReceivingService, ReceivingRepository, ReceivingEventQueue, ReceivingEventWorker],
  exports: [ReceivingService, ReceivingRepository],
})
export class ReceivingModule {}
