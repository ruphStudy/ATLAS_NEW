import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsApiRepository } from './analytics-api.repository';
import { AnalyticsApiEventQueue } from './jobs';
import { KpiManagementService } from '@modules/kpi-management/kpi-management.service';
import { ReportBuilderService } from '@modules/report-builder/report-builder.service';
import { DashboardFrameworkService } from '@modules/dashboard-framework/dashboard-framework.service';
import { DataAggregationEngineService } from '@modules/data-aggregation-engine/data-aggregation-engine.service';
import { ForecastingEngineService } from '@modules/forecasting-engine/forecasting-engine.service';
import { BusinessInsightsService } from '@modules/business-insights/business-insights.service';
import { AnalyticsCacheService } from '@modules/analytics-cache/analytics-cache.service';
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
import {
  ApiVersion,
  ApiEndpoint,
  AnalyticsApiEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AnalyticsApiService {
  private readonly logger = new Logger(AnalyticsApiService.name);
  private readonly CACHE_TTL_MINUTES = 15;
  private readonly RATE_LIMIT_WINDOW_MINUTES = 1;
  private readonly RATE_LIMIT_PER_ENDPOINT = 100;
  private readonly ASYNC_OPERATION_TTL_HOURS = 24;

  constructor(
    private readonly repository: AnalyticsApiRepository,
    private readonly eventQueue: AnalyticsApiEventQueue,
    private readonly kpiService: KpiManagementService,
    private readonly reportService: ReportBuilderService,
    private readonly dashboardService: DashboardFrameworkService,
    private readonly aggregationService: DataAggregationEngineService,
    private readonly forecastService: ForecastingEngineService,
    private readonly insightsService: BusinessInsightsService,
    private readonly cacheService: AnalyticsCacheService,
  ) {}

  async queryDashboard(dto: DashboardQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any>> {
    const startTime = Date.now();

    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.DASHBOARD);

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_REQUEST_RECEIVED,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.DASHBOARD,
      version,
      timestamp: new Date(),
    });

    const cacheKey = this.buildCacheKey('dashboard', dto);
    
    if (dto.ifNoneMatch) {
      const cached = await this.repository.getCachedResponse(cacheKey);
      if (cached) {
        const etag = await this.repository.generateETag(cached);
        if (etag === dto.ifNoneMatch) {
          return this.buildResponse(null, version, { notModified: true });
        }
      }
    }

    let data: any;
    if (dto.dashboardId) {
      data = await this.dashboardService.getDashboardById(dto.dashboardId, dto.workspaceId);
    } else {
      const filter = { workspaceId: dto.workspaceId, page: 1, limit: 20 };
      data = await this.dashboardService.getAllDashboards(filter);
    }

    await this.repository.setCachedResponse(cacheKey, data, this.CACHE_TTL_MINUTES);

    const etag = await this.repository.generateETag(data);
    const duration = Date.now() - startTime;

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_RESPONSE_SENT,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.DASHBOARD,
      version,
      statusCode: 200,
      duration,
      timestamp: new Date(),
    });

    return this.buildResponse(data, version, { etag });
  }

  async queryKpi(dto: KpiQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any>> {
    const startTime = Date.now();

    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.KPI);

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_REQUEST_RECEIVED,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.KPI,
      version,
      timestamp: new Date(),
    });

    let data: any;
    if (dto.kpiId) {
      data = await this.kpiService.getKpiById(dto.kpiId, dto.workspaceId);
    } else if (dto.kpiKeys && dto.kpiKeys.length > 0) {
      data = await this.kpiService.bulkCalculate({
        workspaceId: dto.workspaceId,
        kpiKeys: dto.kpiKeys,
      });
    } else {
      const filter = { workspaceId: dto.workspaceId, page: 1, limit: 20 };
      data = await this.kpiService.getAllKpis(filter);
    }

    const duration = Date.now() - startTime;

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_RESPONSE_SENT,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.KPI,
      version,
      statusCode: 200,
      duration,
      timestamp: new Date(),
    });

    return this.buildResponse(data, version);
  }

  async queryReport(dto: ReportQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any> | AsyncOperationResponseDto> {
    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.REPORT);

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_REQUEST_RECEIVED,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.REPORT,
      version,
      timestamp: new Date(),
    });

    if (dto.async) {
      return this.createAsyncOperation(dto.workspaceId, ApiEndpoint.REPORT);
    }

    const startTime = Date.now();
    let data: any;

    if (dto.reportId) {
      data = await this.reportService.getReportById(dto.reportId, dto.workspaceId);
    } else {
      const filter = { 
        workspaceId: dto.workspaceId, 
        page: dto.pagination?.page ?? 1, 
        limit: dto.pagination?.limit ?? 20,
      };
      data = await this.reportService.getAllReports(filter);
    }

    const duration = Date.now() - startTime;

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_RESPONSE_SENT,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.REPORT,
      version,
      statusCode: 200,
      duration,
      timestamp: new Date(),
    });

    return this.buildResponse(data, version);
  }

  async queryAnalytics(dto: AnalyticsQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any>> {
    const startTime = Date.now();

    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.ANALYTICS);

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_REQUEST_RECEIVED,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.ANALYTICS,
      version,
      timestamp: new Date(),
    });

    const filter = { 
      workspaceId: dto.workspaceId, 
      page: dto.pagination?.page ?? 1, 
      limit: dto.pagination?.limit ?? 20,
    };
    const data = await this.aggregationService.getAllDefinitions(filter);

    const duration = Date.now() - startTime;

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_RESPONSE_SENT,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.ANALYTICS,
      version,
      statusCode: 200,
      duration,
      timestamp: new Date(),
    });

    return this.buildResponse(data, version);
  }

  async queryForecast(dto: ForecastQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any>> {
    const startTime = Date.now();

    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.FORECAST);

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_REQUEST_RECEIVED,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.FORECAST,
      version,
      timestamp: new Date(),
    });

    let data: any;
    if (dto.forecastId) {
      data = await this.forecastService.getDefinitionById(dto.forecastId, dto.workspaceId);
    } else {
      const filter = { workspaceId: dto.workspaceId, page: 1, limit: 20 };
      data = await this.forecastService.getAllDefinitions(filter);
    }

    const duration = Date.now() - startTime;

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_RESPONSE_SENT,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.FORECAST,
      version,
      statusCode: 200,
      duration,
      timestamp: new Date(),
    });

    return this.buildResponse(data, version);
  }

  async queryInsight(dto: InsightQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any>> {
    const startTime = Date.now();

    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.INSIGHT);

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_REQUEST_RECEIVED,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.INSIGHT,
      version,
      timestamp: new Date(),
    });

    let data: any;
    if (dto.insightId) {
      data = await this.insightsService.getInsightById(dto.insightId, dto.workspaceId);
    } else {
      const filter = { 
        workspaceId: dto.workspaceId, 
        domain: dto.domain as any,
        type: dto.type as any,
        priority: dto.priority as any,
        page: dto.pagination?.page ?? 1, 
        limit: dto.pagination?.limit ?? 20,
      };
      data = await this.insightsService.getAllInsights(filter);
    }

    const duration = Date.now() - startTime;

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.API_RESPONSE_SENT,
      workspaceId: dto.workspaceId,
      endpoint: ApiEndpoint.INSIGHT,
      version,
      statusCode: 200,
      duration,
      timestamp: new Date(),
    });

    return this.buildResponse(data, version);
  }

  async requestExport(dto: ExportRequestDto): Promise<AsyncOperationResponseDto> {
    await this.checkRateLimit(dto.workspaceId, ApiEndpoint.EXPORT);

    const operation = await this.createAsyncOperation(dto.workspaceId, ApiEndpoint.EXPORT);

    setImmediate(() => this.processExport(operation.id, dto));

    return operation;
  }

  async bulkQuery(dto: BulkQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any[]>> {
    await this.checkRateLimit(dto.workspaceId, dto.endpoint);

    const results: any[] = [];

    for (const resourceId of dto.resourceIds) {
      try {
        let item: any;
        switch (dto.endpoint) {
          case ApiEndpoint.KPI:
            item = await this.kpiService.getKpiById(resourceId, dto.workspaceId);
            break;
          case ApiEndpoint.REPORT:
            item = await this.reportService.getReportById(resourceId, dto.workspaceId);
            break;
          case ApiEndpoint.DASHBOARD:
            item = await this.dashboardService.getDashboardById(resourceId, dto.workspaceId);
            break;
          case ApiEndpoint.FORECAST:
            item = await this.forecastService.getDefinitionById(resourceId, dto.workspaceId);
            break;
          case ApiEndpoint.INSIGHT:
            item = await this.insightsService.getInsightById(resourceId, dto.workspaceId);
            break;
          default:
            continue;
        }
        results.push(item);
      } catch (error) {
        this.logger.warn(`Failed to fetch ${dto.endpoint} ${resourceId}: ${(error as Error).message}`);
      }
    }

    return this.buildResponse(results, version);
  }

  async drillDown(dto: DrillDownQueryDto, version: ApiVersion = ApiVersion.V1): Promise<ApiResponseDto<any>> {
    await this.checkRateLimit(dto.workspaceId, dto.endpoint);

    const data = {
      dimension: dto.dimension,
      value: dto.value,
      details: [],
      total: 0,
    };

    return this.buildResponse(data, version);
  }

  async getAsyncOperationStatus(dto: AsyncOperationStatusDto): Promise<AsyncOperationResponseDto> {
    const operation = await this.repository.findAsyncOperation(dto.operationId, dto.workspaceId);
    if (!operation) {
      throw new ResourceNotFoundException(
        `Async operation ${dto.operationId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return operation as AsyncOperationResponseDto;
  }

  private async createAsyncOperation(
    workspaceId: string,
    endpoint: ApiEndpoint,
  ): Promise<AsyncOperationResponseDto> {
    const expiresAt = new Date(Date.now() + this.ASYNC_OPERATION_TTL_HOURS * 3600000);
    const operation = await this.repository.createAsyncOperation({
      workspaceId,
      endpoint,
      expiresAt,
    });

    await this.eventQueue.publish({
      event: AnalyticsApiEventType.ASYNC_OPERATION_STARTED,
      workspaceId,
      endpoint,
      asyncOperationId: operation.id,
      timestamp: new Date(),
    });

    return operation as AsyncOperationResponseDto;
  }

  private async processExport(operationId: string, dto: ExportRequestDto): Promise<void> {
    try {
      await this.repository.updateAsyncOperation(operationId, {
        status: 'processing',
        progress: 50,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const resultUrl = `/api/analytics/exports/${operationId}/download`;

      await this.repository.updateAsyncOperation(operationId, {
        status: 'completed',
        progress: 100,
        resultUrl,
      });

      await this.eventQueue.publish({
        event: AnalyticsApiEventType.ASYNC_OPERATION_COMPLETED,
        workspaceId: dto.workspaceId,
        endpoint: dto.endpoint,
        asyncOperationId: operationId,
        timestamp: new Date(),
      });
    } catch (error) {
      await this.repository.updateAsyncOperation(operationId, {
        status: 'failed',
        error: (error as Error).message,
      });
    }
  }

  private async checkRateLimit(workspaceId: string, endpoint: ApiEndpoint): Promise<void> {
    const status = await this.repository.checkRateLimit(
      workspaceId,
      endpoint,
      this.RATE_LIMIT_WINDOW_MINUTES,
      this.RATE_LIMIT_PER_ENDPOINT,
    );

    if (status.remaining <= 0) {
      await this.eventQueue.publish({
        event: AnalyticsApiEventType.RATE_LIMIT_EXCEEDED,
        workspaceId,
        endpoint,
        timestamp: new Date(),
        metadata: { limit: status.limit, window: this.RATE_LIMIT_WINDOW_MINUTES },
      });

      throw new BusinessRuleException(
        `Rate limit exceeded for ${endpoint}`,
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    await this.repository.recordApiRequest(workspaceId, endpoint, ApiVersion.V1);
  }

  private buildResponse<T>(
    data: T,
    version: ApiVersion,
    options?: { etag?: string; notModified?: boolean },
  ): ApiResponseDto<T> {
    return {
      version,
      data: options?.notModified ? null as any : data,
      meta: {
        timestamp: new Date(),
        etag: options?.etag,
      },
    };
  }

  private buildCacheKey(prefix: string, dto: any): string {
    const parts = [prefix, dto.workspaceId];
    if (dto.dashboardId) parts.push(dto.dashboardId);
    if (dto.kpiId) parts.push(dto.kpiId);
    if (dto.reportId) parts.push(dto.reportId);
    return parts.join(':');
  }
}
