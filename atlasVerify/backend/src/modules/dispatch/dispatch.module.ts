import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DispatchRepository } from './dispatch.repository';
import { DispatchEventQueue, DispatchEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'dispatch-events',
    }),
  ],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchRepository, DispatchEventQueue, DispatchEventWorker],
  exports: [DispatchService, DispatchRepository],
})
export class DispatchModule {}
