import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SupplierProviderModule } from '@modules/supplier-provider/supplier-provider.module';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';
import { ShipmentRepository } from './shipment.repository';
import {
  ShipmentEventQueue,
  TrackingSyncQueue,
  ShipmentEventWorker,
  TrackingSyncWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule, SupplierProviderModule],
  controllers: [ShipmentController],
  providers: [
    ShipmentService,
    ShipmentRepository,
    ShipmentEventQueue,
    TrackingSyncQueue,
    ShipmentEventWorker,
    TrackingSyncWorker,
  ],
  exports: [ShipmentService],
})
export class ShipmentTrackingModule {}
