import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { InventoryAvailabilityController } from './inventory-availability.controller';
import { InventoryAvailabilityService } from './inventory-availability.service';
import { InventoryAvailabilityRepository } from './inventory-availability.repository';
import { AvailabilityEventQueue, AvailabilityEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'inventory-availability-events',
    }),
  ],
  controllers: [InventoryAvailabilityController],
  providers: [
    InventoryAvailabilityService,
    InventoryAvailabilityRepository,
    AvailabilityEventQueue,
    AvailabilityEventWorker,
  ],
  exports: [InventoryAvailabilityService, InventoryAvailabilityRepository],
})
export class InventoryAvailabilityModule {}
