import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportsRepository } from './scheduled-reports.repository';
import { ScheduledReportsEventQueue, ScheduledReportsEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';
import { ReportBuilderModule } from '@modules/report-builder/report-builder.module';

@Module({
  imports: [
    DatabaseModule,
    ReportBuilderModule,
    BullModule.registerQueue({
      name: 'scheduled-reports-events',
    }),
  ],
  controllers: [ScheduledReportsController],
  providers: [
    ScheduledReportsService,
    ScheduledReportsRepository,
    ScheduledReportsEventQueue,
    ScheduledReportsEventWorker,
  ],
  exports: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
