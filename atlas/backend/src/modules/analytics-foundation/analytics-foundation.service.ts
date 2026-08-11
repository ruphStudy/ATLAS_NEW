import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsFoundationRepository } from './analytics-foundation.repository';
import { AnalyticsFoundationEventQueue } from './jobs';
import {
  RegisterAnalyticsEntityDto,
  UpdateAnalyticsEntityDto,
  AnalyticsEntityResponseDto,
  RegisterAnalyticsDimensionDto,
  UpdateAnalyticsDimensionDto,
  AnalyticsDimensionResponseDto,
  RegisterAnalyticsMetricDto,
  UpdateAnalyticsMetricDto,
  AnalyticsMetricResponseDto,
  ExecuteAnalyticsQueryDto,
  AnalyticsQueryResultDto,
  RegisterAnalyticsKpiDto,
  UpdateAnalyticsKpiDto,
  AnalyticsKpiResponseDto,
  CreateAnalyticsSnapshotDto,
  AnalyticsSnapshotResponseDto,
  CreateAnalyticsConfigurationDto,
  UpdateAnalyticsConfigurationDto,
  AnalyticsConfigurationResponseDto,
} from './dto';
import {
  IAnalyticsEntity,
  IAnalyticsDimension,
  IAnalyticsMetric,
  IAnalyticsKpi,
  IAnalyticsSnapshot,
  IAnalyticsConfiguration,
  IAnalyticsQuery,
  IAnalyticsQueryResult,
  AnalyticsEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsFoundationService {
  private readonly logger = new Logger(AnalyticsFoundationService.name);

  constructor(
    private readonly repository: AnalyticsFoundationRepository,
    private readonly eventQueue: AnalyticsFoundationEventQueue,
  ) {}

  async registerEntity(
    dto: RegisterAnalyticsEntityDto,
  ): Promise<AnalyticsEntityResponseDto> {
    const existing = await this.repository.findEntityByKey(
      dto.entityKey,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Analytics entity with this key already exists',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const data = {
      ...dto,
      isActive: dto.isActive ?? true,
    };

    const entity = await this.repository.createEntity(data);

    await this.eventQueue.publish({
      event: AnalyticsEventType.ENTITY_REGISTERED,
      workspaceId: entity.workspaceId,
      entityType: entity.entityType,
      entityId: entity.id,
    });

    return entity as AnalyticsEntityResponseDto;
  }

  async getEntity(
    id: string,
    workspaceId: string,
  ): Promise<AnalyticsEntityResponseDto> {
    const entity = await this.repository.findEntityById(id, workspaceId);

    if (!entity) {
      throw new ResourceNotFoundException(
        'Analytics entity not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return entity as AnalyticsEntityResponseDto;
  }

  async listEntities(
    workspaceId: string,
    filters?: { entityType?: string; isActive?: boolean },
  ): Promise<AnalyticsEntityResponseDto[]> {
    const entities = await this.repository.findAllEntities(workspaceId, filters);
    return entities as AnalyticsEntityResponseDto[];
  }

  async updateEntity(
    id: string,
    workspaceId: string,
    dto: UpdateAnalyticsEntityDto,
  ): Promise<AnalyticsEntityResponseDto> {
    await this.getEntity(id, workspaceId);

    const updated = await this.repository.updateEntity(id, dto);

    return updated as AnalyticsEntityResponseDto;
  }

  async deleteEntity(id: string, workspaceId: string): Promise<void> {
    await this.getEntity(id, workspaceId);
    await this.repository.deleteEntity(id);
  }

  async registerDimension(
    dto: RegisterAnalyticsDimensionDto,
  ): Promise<AnalyticsDimensionResponseDto> {
    const existing = await this.repository.findDimensionByKey(
      dto.dimensionKey,
      dto.entityType,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Analytics dimension with this key already exists for this entity type',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const data = {
      ...dto,
      isActive: dto.isActive ?? true,
    };

    const dimension = await this.repository.createDimension(data);

    await this.eventQueue.publish({
      event: AnalyticsEventType.DIMENSION_REGISTERED,
      workspaceId: dimension.workspaceId,
      entityType: dimension.entityType,
      entityId: dimension.id,
    });

    return dimension as AnalyticsDimensionResponseDto;
  }

  async getDimension(
    id: string,
    workspaceId: string,
  ): Promise<AnalyticsDimensionResponseDto> {
    const dimension = await this.repository.findDimensionById(id, workspaceId);

    if (!dimension) {
      throw new ResourceNotFoundException(
        'Analytics dimension not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return dimension as AnalyticsDimensionResponseDto;
  }

  async listDimensions(
    workspaceId: string,
    filters?: { entityType?: string; isActive?: boolean },
  ): Promise<AnalyticsDimensionResponseDto[]> {
    const dimensions = await this.repository.findAllDimensions(
      workspaceId,
      filters,
    );
    return dimensions as AnalyticsDimensionResponseDto[];
  }

  async updateDimension(
    id: string,
    workspaceId: string,
    dto: UpdateAnalyticsDimensionDto,
  ): Promise<AnalyticsDimensionResponseDto> {
    await this.getDimension(id, workspaceId);

    const updated = await this.repository.updateDimension(id, dto);

    return updated as AnalyticsDimensionResponseDto;
  }

  async deleteDimension(id: string, workspaceId: string): Promise<void> {
    await this.getDimension(id, workspaceId);
    await this.repository.deleteDimension(id);
  }

  async registerMetric(
    dto: RegisterAnalyticsMetricDto,
  ): Promise<AnalyticsMetricResponseDto> {
    const existing = await this.repository.findMetricByKey(
      dto.metricKey,
      dto.entityType,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Analytics metric with this key already exists for this entity type',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const data = {
      ...dto,
      isActive: dto.isActive ?? true,
    };

    const metric = await this.repository.createMetric(data);

    await this.eventQueue.publish({
      event: AnalyticsEventType.METRIC_REGISTERED,
      workspaceId: metric.workspaceId,
      entityType: metric.entityType,
      entityId: metric.id,
    });

    return metric as AnalyticsMetricResponseDto;
  }

  async getMetric(
    id: string,
    workspaceId: string,
  ): Promise<AnalyticsMetricResponseDto> {
    const metric = await this.repository.findMetricById(id, workspaceId);

    if (!metric) {
      throw new ResourceNotFoundException(
        'Analytics metric not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return metric as AnalyticsMetricResponseDto;
  }

  async listMetrics(
    workspaceId: string,
    filters?: { entityType?: string; isActive?: boolean },
  ): Promise<AnalyticsMetricResponseDto[]> {
    const metrics = await this.repository.findAllMetrics(workspaceId, filters);
    return metrics as AnalyticsMetricResponseDto[];
  }

  async updateMetric(
    id: string,
    workspaceId: string,
    dto: UpdateAnalyticsMetricDto,
  ): Promise<AnalyticsMetricResponseDto> {
    await this.getMetric(id, workspaceId);

    const updated = await this.repository.updateMetric(id, dto);

    return updated as AnalyticsMetricResponseDto;
  }

  async deleteMetric(id: string, workspaceId: string): Promise<void> {
    await this.getMetric(id, workspaceId);
    await this.repository.deleteMetric(id);
  }

  async executeQuery(
    dto: ExecuteAnalyticsQueryDto,
  ): Promise<AnalyticsQueryResultDto> {
    const startTime = Date.now();

    const metrics = await this.validateMetrics(
      dto.metrics,
      dto.entityType,
      dto.workspaceId,
    );

    if (dto.dimensions) {
      await this.validateDimensions(
        dto.dimensions,
        dto.entityType,
        dto.workspaceId,
      );
    }

    const query: IAnalyticsQuery = {
      entityType: dto.entityType,
      metrics: dto.metrics,
      dimensions: dto.dimensions,
      filters: dto.filters,
      aggregation: dto.aggregation,
      startDate: dto.startDate,
      endDate: dto.endDate,
      limit: dto.limit,
      offset: dto.offset,
      orderBy: dto.orderBy,
    };

    const result = await this.performQuery(query);

    const executionTimeMs = Date.now() - startTime;

    const queryResult: AnalyticsQueryResultDto = {
      queryId: uuidv4(),
      entityType: dto.entityType,
      data: result.data,
      total: result.total,
      executionTimeMs,
      metadata: result.metadata,
    };

    await this.eventQueue.publish({
      event: AnalyticsEventType.QUERY_EXECUTED,
      workspaceId: dto.workspaceId,
      entityType: dto.entityType,
      metadata: {
        queryId: queryResult.queryId,
        executionTimeMs,
      },
    });

    return queryResult;
  }

  async registerKpi(dto: RegisterAnalyticsKpiDto): Promise<AnalyticsKpiResponseDto> {
    const existing = await this.repository.findKpiByKey(
      dto.kpiKey,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Analytics KPI with this key already exists',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    await this.validateMetrics([dto.metricKey], dto.entityType, dto.workspaceId);

    const data = {
      ...dto,
      isActive: dto.isActive ?? true,
    };

    const kpi = await this.repository.createKpi(data);

    await this.eventQueue.publish({
      event: AnalyticsEventType.KPI_CALCULATED,
      workspaceId: kpi.workspaceId,
      entityType: kpi.entityType,
      entityId: kpi.id,
    });

    return kpi as AnalyticsKpiResponseDto;
  }

  async getKpi(id: string, workspaceId: string): Promise<AnalyticsKpiResponseDto> {
    const kpi = await this.repository.findKpiById(id, workspaceId);

    if (!kpi) {
      throw new ResourceNotFoundException(
        'Analytics KPI not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return kpi as AnalyticsKpiResponseDto;
  }

  async listKpis(
    workspaceId: string,
    filters?: { entityType?: string; isActive?: boolean },
  ): Promise<AnalyticsKpiResponseDto[]> {
    const kpis = await this.repository.findAllKpis(workspaceId, filters);
    return kpis as AnalyticsKpiResponseDto[];
  }

  async updateKpi(
    id: string,
    workspaceId: string,
    dto: UpdateAnalyticsKpiDto,
  ): Promise<AnalyticsKpiResponseDto> {
    await this.getKpi(id, workspaceId);

    const updated = await this.repository.updateKpi(id, dto);

    return updated as AnalyticsKpiResponseDto;
  }

  async deleteKpi(id: string, workspaceId: string): Promise<void> {
    await this.getKpi(id, workspaceId);
    await this.repository.deleteKpi(id);
  }

  async createSnapshot(
    dto: CreateAnalyticsSnapshotDto,
  ): Promise<AnalyticsSnapshotResponseDto> {
    const snapshot = await this.repository.createSnapshot(dto);

    await this.eventQueue.publish({
      event: AnalyticsEventType.SNAPSHOT_CREATED,
      workspaceId: snapshot.workspaceId,
      entityType: snapshot.entityType,
      entityId: snapshot.id,
    });

    return snapshot as AnalyticsSnapshotResponseDto;
  }

  async getSnapshot(
    id: string,
    workspaceId: string,
  ): Promise<AnalyticsSnapshotResponseDto> {
    const snapshot = await this.repository.findSnapshotById(id, workspaceId);

    if (!snapshot) {
      throw new ResourceNotFoundException(
        'Analytics snapshot not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return snapshot as AnalyticsSnapshotResponseDto;
  }

  async listSnapshots(
    snapshotKey: string,
    workspaceId: string,
    limit?: number,
  ): Promise<AnalyticsSnapshotResponseDto[]> {
    const snapshots = await this.repository.findSnapshotsByKey(
      snapshotKey,
      workspaceId,
      limit,
    );
    return snapshots as AnalyticsSnapshotResponseDto[];
  }

  async deleteSnapshot(id: string, workspaceId: string): Promise<void> {
    await this.getSnapshot(id, workspaceId);
    await this.repository.deleteSnapshot(id);
  }

  async createConfiguration(
    dto: CreateAnalyticsConfigurationDto,
  ): Promise<AnalyticsConfigurationResponseDto> {
    const existing = await this.repository.findConfigurationByKey(
      dto.configKey,
      dto.workspaceId,
    );

    if (existing) {
      throw new BusinessRuleException(
        'Analytics configuration with this key already exists',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const data = {
      ...dto,
      isActive: dto.isActive ?? true,
    };

    const configuration = await this.repository.createConfiguration(data);

    await this.eventQueue.publish({
      event: AnalyticsEventType.CONFIGURATION_UPDATED,
      workspaceId: configuration.workspaceId,
      entityType: configuration.entityType,
      entityId: configuration.id,
    });

    return configuration as AnalyticsConfigurationResponseDto;
  }

  async getConfiguration(
    id: string,
    workspaceId: string,
  ): Promise<AnalyticsConfigurationResponseDto> {
    const configuration = await this.repository.findConfigurationById(
      id,
      workspaceId,
    );

    if (!configuration) {
      throw new ResourceNotFoundException(
        'Analytics configuration not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return configuration as AnalyticsConfigurationResponseDto;
  }

  async listConfigurations(
    workspaceId: string,
    filters?: { entityType?: string; isActive?: boolean },
  ): Promise<AnalyticsConfigurationResponseDto[]> {
    const configurations = await this.repository.findAllConfigurations(
      workspaceId,
      filters,
    );
    return configurations as AnalyticsConfigurationResponseDto[];
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    dto: UpdateAnalyticsConfigurationDto,
  ): Promise<AnalyticsConfigurationResponseDto> {
    await this.getConfiguration(id, workspaceId);

    const updated = await this.repository.updateConfiguration(id, dto);

    await this.eventQueue.publish({
      event: AnalyticsEventType.CONFIGURATION_UPDATED,
      workspaceId: updated.workspaceId,
      entityType: updated.entityType,
      entityId: updated.id,
    });

    return updated as AnalyticsConfigurationResponseDto;
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.getConfiguration(id, workspaceId);
    await this.repository.deleteConfiguration(id);
  }

  private async validateMetrics(
    metricKeys: string[],
    entityType: string,
    workspaceId: string,
  ): Promise<IAnalyticsMetric[]> {
    const metrics: IAnalyticsMetric[] = [];

    for (const metricKey of metricKeys) {
      const metric = await this.repository.findMetricByKey(
        metricKey,
        entityType,
        workspaceId,
      );

      if (!metric) {
        throw new BusinessRuleException(
          `Metric '${metricKey}' not found for entity type '${entityType}'`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }

      if (!metric.isActive) {
        throw new BusinessRuleException(
          `Metric '${metricKey}' is not active`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }

      metrics.push(metric);
    }

    return metrics;
  }

  private async validateDimensions(
    dimensionKeys: string[],
    entityType: string,
    workspaceId: string,
  ): Promise<IAnalyticsDimension[]> {
    const dimensions: IAnalyticsDimension[] = [];

    for (const dimensionKey of dimensionKeys) {
      const dimension = await this.repository.findDimensionByKey(
        dimensionKey,
        entityType,
        workspaceId,
      );

      if (!dimension) {
        throw new BusinessRuleException(
          `Dimension '${dimensionKey}' not found for entity type '${entityType}'`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }

      if (!dimension.isActive) {
        throw new BusinessRuleException(
          `Dimension '${dimensionKey}' is not active`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }

      dimensions.push(dimension);
    }

    return dimensions;
  }

  private async performQuery(
    query: IAnalyticsQuery,
  ): Promise<IAnalyticsQueryResult> {
    this.logger.debug(`Executing analytics query for entity: ${query.entityType}`);

    const mockData: Record<string, any>[] = [];
    const total = 0;

    return {
      queryId: uuidv4(),
      entityType: query.entityType,
      data: mockData,
      total,
      executionTimeMs: 0,
      metadata: {},
    };
  }
}
