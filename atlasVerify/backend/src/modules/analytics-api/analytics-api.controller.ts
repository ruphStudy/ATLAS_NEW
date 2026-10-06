import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsApiService } from './analytics-api.service';
import {
  DashboardQueryDto,
  KpiQueryDto,
  ReportQueryDto,
  AnalyticsQueryDto,
  ForecastQueryDto,
  InsightQueryDto,
  ExportRequestDto,
  AsyncOperationStatusDto,
  BulkQueryDto,
  DrillDownQueryDto,
  AsyncOperationResponseDto,
  ApiResponseDto,
} from './dto';
import { ApiVersion } from './interfaces';

@Controller('analytics-api')
export class AnalyticsApiController {
  constructor(private readonly analyticsApiService: AnalyticsApiService) {}

  @Post('v1/dashboards/query')
  @HttpCode(HttpStatus.OK)
  async queryDashboardV1(
    @Body() dto: DashboardQueryDto,
    @Headers('if-none-match') ifNoneMatch?: string,
  ): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryDashboard(
      { ...dto, ifNoneMatch },
      ApiVersion.V1,
    );
  }

  @Post('v1/kpis/query')
  @HttpCode(HttpStatus.OK)
  async queryKpiV1(@Body() dto: KpiQueryDto): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryKpi(dto, ApiVersion.V1);
  }

  @Post('v1/reports/query')
  @HttpCode(HttpStatus.OK)
  async queryReportV1(
    @Body() dto: ReportQueryDto,
  ): Promise<ApiResponseDto<any> | AsyncOperationResponseDto> {
    return this.analyticsApiService.queryReport(dto, ApiVersion.V1);
  }

  @Post('v1/analytics/query')
  @HttpCode(HttpStatus.OK)
  async queryAnalyticsV1(@Body() dto: AnalyticsQueryDto): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryAnalytics(dto, ApiVersion.V1);
  }

  @Post('v1/forecasts/query')
  @HttpCode(HttpStatus.OK)
  async queryForecastV1(@Body() dto: ForecastQueryDto): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryForecast(dto, ApiVersion.V1);
  }

  @Post('v1/insights/query')
  @HttpCode(HttpStatus.OK)
  async queryInsightV1(@Body() dto: InsightQueryDto): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryInsight(dto, ApiVersion.V1);
  }

  @Post('v1/exports')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestExport(@Body() dto: ExportRequestDto): Promise<AsyncOperationResponseDto> {
    return this.analyticsApiService.requestExport(dto);
  }

  @Post('v1/bulk/query')
  @HttpCode(HttpStatus.OK)
  async bulkQuery(@Body() dto: BulkQueryDto): Promise<ApiResponseDto<any[]>> {
    return this.analyticsApiService.bulkQuery(dto, ApiVersion.V1);
  }

  @Post('v1/drill-down')
  @HttpCode(HttpStatus.OK)
  async drillDown(@Body() dto: DrillDownQueryDto): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.drillDown(dto, ApiVersion.V1);
  }

  @Get('v1/operations/:operationId')
  async getAsyncOperationStatus(
    @Param('operationId') operationId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AsyncOperationResponseDto> {
    return this.analyticsApiService.getAsyncOperationStatus({
      operationId,
      workspaceId,
    });
  }

  @Get('v1/dashboards/:dashboardId')
  async getDashboard(
    @Param('dashboardId') dashboardId: string,
    @Query('workspaceId') workspaceId: string,
    @Headers('if-none-match') ifNoneMatch?: string,
  ): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryDashboard(
      { workspaceId, dashboardId, ifNoneMatch },
      ApiVersion.V1,
    );
  }

  @Get('v1/kpis/:kpiId')
  async getKpi(
    @Param('kpiId') kpiId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryKpi({ workspaceId, kpiId }, ApiVersion.V1);
  }

  @Get('v1/reports/:reportId')
  async getReport(
    @Param('reportId') reportId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryReport({ workspaceId, reportId }, ApiVersion.V1);
  }

  @Get('v1/forecasts/:forecastId')
  async getForecast(
    @Param('forecastId') forecastId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryForecast(
      { workspaceId, forecastId },
      ApiVersion.V1,
    );
  }

  @Get('v1/insights/:insightId')
  async getInsight(
    @Param('insightId') insightId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ApiResponseDto<any>> {
    return this.analyticsApiService.queryInsight(
      { workspaceId, insightId },
      ApiVersion.V1,
    );
  }
}
