import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportFrameworkController } from './export-framework.controller';
import { ExportFrameworkService } from './export-framework.service';
import { ExportFrameworkRepository } from './export-framework.repository';
import { ExportFrameworkEventQueue, ExportFrameworkEventWorker } from './jobs';
import { DatabaseModule } from '@database/database.module';
import { ReportBuilderModule } from '@modules/report-builder/report-builder.module';

@Module({
  imports: [
    DatabaseModule,
    ReportBuilderModule,
    BullModule.registerQueue({
      name: 'export-framework-events',
    }),
  ],
  controllers: [ExportFrameworkController],
  providers: [
    ExportFrameworkService,
    ExportFrameworkRepository,
    ExportFrameworkEventQueue,
    ExportFrameworkEventWorker,
  ],
  exports: [ExportFrameworkService],
})
export class ExportFrameworkModule {}
