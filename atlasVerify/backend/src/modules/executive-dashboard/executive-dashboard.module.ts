import { Module } from '@nestjs/common';
import { ExecutiveDashboardController } from './executive-dashboard.controller';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { ExecutiveDashboardRepository } from './executive-dashboard.repository';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService, ExecutiveDashboardRepository],
  exports: [ExecutiveDashboardService],
})
export class ExecutiveDashboardModule {}
