import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { KpiManagementModule } from '@modules/kpi-management/kpi-management.module';
import { ReportBuilderModule } from '@modules/report-builder/report-builder.module';
import { DashboardFrameworkModule } from '@modules/dashboard-framework/dashboard-framework.module';
import { DataAggregationEngineModule } from '@modules/data-aggregation-engine/data-aggregation-engine.module';
import { ForecastingEngineModule } from '@modules/forecasting-engine/forecasting-engine.module';
import { BusinessInsightsModule } from '@modules/business-insights/business-insights.module';
import { AnalyticsCacheModule } from '@modules/analytics-cache/analytics-cache.module';
import { AnalyticsApiController } from './analytics-api.controller';
import { AnalyticsApiService } from './analytics-api.service';
import { AnalyticsApiRepository } from './analytics-api.repository';
import { AnalyticsApiEventQueue, AnalyticsApiEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'analytics-api-events',
    }),
    KpiManagementModule,
    ReportBuilderModule,
    DashboardFrameworkModule,
    DataAggregationEngineModule,
    ForecastingEngineModule,
    BusinessInsightsModule,
    AnalyticsCacheModule,
  ],
  controllers: [AnalyticsApiController],
  providers: [
    AnalyticsApiService,
    AnalyticsApiRepository,
    AnalyticsApiEventQueue,
    AnalyticsApiEventWorker,
  ],
  exports: [AnalyticsApiService],
})
export class AnalyticsApiModule {}
