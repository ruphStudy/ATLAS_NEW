import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';

/**
 * ReportsModule
 *
 * Responsibilities:
 *   - Report generation (async via BullMQ)
 *   - Report scheduling
 *   - Report export (CSV, PDF, XLSX)
 *   - Report storage and retrieval
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
