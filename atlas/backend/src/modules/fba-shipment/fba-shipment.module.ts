import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { FBAShipmentController } from './fba-shipment.controller';
import { FBAShipmentService } from './fba-shipment.service';
import { FBAShipmentRepository } from './fba-shipment.repository';
import { FBAShipmentEventQueue, FBAShipmentEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'fba-shipment-events',
    }),
  ],
  controllers: [FBAShipmentController],
  providers: [
    FBAShipmentService,
    FBAShipmentRepository,
    FBAShipmentEventQueue,
    FBAShipmentEventWorker,
  ],
  exports: [FBAShipmentService, FBAShipmentRepository],
})
export class FBAShipmentModule {}
