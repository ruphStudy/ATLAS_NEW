import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './warehouse.repository';
import { WarehouseLocationController } from './warehouse-location.controller';
import { WarehouseLocationService } from './warehouse-location.service';
import { WarehouseLocationRepository } from './warehouse-location.repository';
import { WarehouseBinController } from './warehouse-bin.controller';
import { WarehouseBinService } from './warehouse-bin.service';
import { WarehouseBinRepository } from './warehouse-bin.repository';
import { WarehouseZoneController } from './warehouse-zone.controller';
import { WarehouseZoneService } from './warehouse-zone.service';
import { WarehouseZoneRepository } from './warehouse-zone.repository';
import { WarehouseCapacityController } from './warehouse-capacity.controller';
import { WarehouseCapacityService } from './warehouse-capacity.service';
import { WarehouseCapacityRepository } from './warehouse-capacity.repository';
import { WarehouseEventQueue, WarehouseEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'warehouse-events',
    }),
  ],
  controllers: [
    WarehouseController,
    WarehouseLocationController,
    WarehouseBinController,
    WarehouseZoneController,
    WarehouseCapacityController,
  ],
  providers: [
    WarehouseService,
    WarehouseRepository,
    WarehouseLocationService,
    WarehouseLocationRepository,
    WarehouseBinService,
    WarehouseBinRepository,
    WarehouseZoneService,
    WarehouseZoneRepository,
    WarehouseCapacityService,
    WarehouseCapacityRepository,
    WarehouseEventQueue,
    WarehouseEventWorker,
  ],
  exports: [
    WarehouseService,
    WarehouseLocationService,
    WarehouseBinService,
    WarehouseZoneService,
    WarehouseCapacityService,
    WarehouseRepository,
    WarehouseBinRepository,
    WarehouseZoneRepository,
    WarehouseCapacityRepository,
  ],
})
export class WarehouseModule {}
