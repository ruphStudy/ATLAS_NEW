import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DashboardFrameworkController } from './dashboard-framework.controller';
import { DashboardFrameworkService } from './dashboard-framework.service';
import { DashboardFrameworkRepository } from './dashboard-framework.repository';
import {
  DashboardFrameworkEventQueue,
  DashboardFrameworkEventWorker,
} from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'dashboard-framework-events',
    }),
  ],
  controllers: [DashboardFrameworkController],
  providers: [
    DashboardFrameworkService,
    DashboardFrameworkRepository,
    DashboardFrameworkEventQueue,
    DashboardFrameworkEventWorker,
  ],
  exports: [DashboardFrameworkService],
})
export class DashboardFrameworkModule {}
