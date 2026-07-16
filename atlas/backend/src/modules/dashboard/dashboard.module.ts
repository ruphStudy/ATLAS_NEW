import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';

/**
 * DashboardModule
 *
 * Responsibilities:
 *   - KPI aggregation and delivery
 *   - Revenue, sales velocity, margin summaries
 *   - Widget data endpoints
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
