import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { KpiManagementController } from './kpi-management.controller';
import { KpiManagementService } from './kpi-management.service';
import { KpiManagementRepository } from './kpi-management.repository';
import { KpiManagementEventQueue, KpiManagementEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'kpi-management-events',
    }),
  ],
  controllers: [KpiManagementController],
  providers: [
    KpiManagementService,
    KpiManagementRepository,
    KpiManagementEventQueue,
    KpiManagementEventWorker,
  ],
  exports: [KpiManagementService],
})
export class KpiManagementModule {}
