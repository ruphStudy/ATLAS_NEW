import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { WarehouseAuditController } from './warehouse-audit.controller';
import { WarehouseAuditService } from './warehouse-audit.service';
import { WarehouseAuditRepository } from './warehouse-audit.repository';
import { WarehouseAuditEventQueue, WarehouseAuditEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'warehouse-audit-events',
    }),
  ],
  controllers: [WarehouseAuditController],
  providers: [
    WarehouseAuditService,
    WarehouseAuditRepository,
    WarehouseAuditEventQueue,
    WarehouseAuditEventWorker,
  ],
  exports: [WarehouseAuditService, WarehouseAuditRepository],
})
export class WarehouseAuditModule {}
