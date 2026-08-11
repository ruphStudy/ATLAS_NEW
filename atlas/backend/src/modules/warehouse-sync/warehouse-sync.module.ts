import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { WarehouseSyncController } from './warehouse-sync.controller';
import { WarehouseSyncService } from './warehouse-sync.service';
import { WarehouseSyncRepository } from './warehouse-sync.repository';
import { WarehouseSyncEventQueue, WarehouseSyncEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'warehouse-sync-events',
    }),
  ],
  controllers: [WarehouseSyncController],
  providers: [
    WarehouseSyncService,
    WarehouseSyncRepository,
    WarehouseSyncEventQueue,
    WarehouseSyncEventWorker,
  ],
  exports: [WarehouseSyncService, WarehouseSyncRepository],
})
export class WarehouseSyncModule {}
