import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportBuilderController } from './report-builder.controller';
import { ReportBuilderService } from './report-builder.service';
import { ReportBuilderRepository } from './report-builder.repository';
import { ReportBuilderEventQueue, ReportBuilderEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'report-builder-events',
    }),
  ],
  controllers: [ReportBuilderController],
  providers: [
    ReportBuilderService,
    ReportBuilderRepository,
    ReportBuilderEventQueue,
    ReportBuilderEventWorker,
  ],
  exports: [ReportBuilderService],
})
export class ReportBuilderModule {}
