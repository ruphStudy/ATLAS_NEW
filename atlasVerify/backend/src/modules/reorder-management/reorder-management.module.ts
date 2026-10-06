import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { ReorderManagementController } from './reorder-management.controller';
import { ReorderManagementService } from './reorder-management.service';
import { ReorderManagementRepository } from './reorder-management.repository';
import { ReorderEventQueue, ReorderEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'reorder-events',
    }),
  ],
  controllers: [ReorderManagementController],
  providers: [
    ReorderManagementService,
    ReorderManagementRepository,
    ReorderEventQueue,
    ReorderEventWorker,
  ],
  exports: [ReorderManagementService, ReorderManagementRepository],
})
export class ReorderManagementModule {}
