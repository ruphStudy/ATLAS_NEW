import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KpiManagementRepository } from './kpi-management.repository';
import { KpiManagementEventQueue } from './jobs';
import {
  CreateKpiDefinitionDto,
  UpdateKpiDefinitionDto,
  CalculateKpiDto,
  CreateKpiSnapshotDto,
  CreateKpiGroupDto,
  UpdateKpiGroupDto,
  AcknowledgeKpiAlertDto,
  KpiFilterDto,
  KpiDefinitionResponseDto,
  KpiValueResponseDto,
  KpiSnapshotResponseDto,
  KpiVersionResponseDto,
  KpiHistoryResponseDto,
  KpiGroupResponseDto,
  KpiAlertResponseDto,
  KpiCalculationResultResponseDto,
} from './dto';
import {
  KpiEventType,
  KpiStatus,
  KpiHealthStatus,
  KpiTrendDirection,
  KpiThresholdOperator,
  IKpiThreshold,
} from './interfaces';

@Injectable()
export class KpiManagementService {
  private readonly logger = new Logger(KpiManagementService.name);

  constructor(
    private readonly repository: KpiManagementRepository,
    private readonly eventQueue: KpiManagementEventQueue,
  ) {}

  async createDefinition(dto: CreateKpiDefinitionDto): Promise<KpiDefinitionResponseDto> {
    const definition = await this.repository.createDefinition({
      ...dto,
      status: KpiStatus.DRAFT,
      drillDownEnabled: dto.drillDownEnabled ?? true,
      cacheEnabled: dto.cacheEnabled ?? true,
      cacheTtlMinutes: dto.cacheTtlMinutes ?? 15,
    });

    await this.repository.createVersion({
      kpiDefinitionId: definition.id,
      version: 1,
      definition,
      changeDescription: 'Initial version',
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: KpiEventType.KPI_CREATED,
      workspaceId: definition.workspaceId || 'system',
      kpiDefinitionId: definition.id,
      kpiKey: definition.kpiKey,
      timestamp: new Date(),
    });

    return definition as KpiDefinitionResponseDto;
  }

  async updateDefinition(
    id: string,
    workspaceId: string,
    dto: UpdateKpiDefinitionDto,
  ): Promise<KpiDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`KPI definition ${id} not found`);
    }

    const updated = await this.repository.updateDefinition(id, {
      ...dto,
      version: existing.version + 1,
    });

    await this.repository.createVersion({
      kpiDefinitionId: id,
      version: updated.version,
      definition: updated,
      changeDescription: `Updated by ${dto.updatedBy}`,
      createdBy: dto.updatedBy,
    });

    await this.repository.invalidateCache(workspaceId, `kpi:${existing.kpiKey}:*`);

    await this.eventQueue.publish({
      event: KpiEventType.KPI_UPDATED,
      workspaceId,
      kpiDefinitionId: id,
      kpiKey: existing.kpiKey,
      timestamp: new Date(),
      metadata: { version: updated.version },
    });

    return updated as KpiDefinitionResponseDto;
  }

  async getDefinitionById(id: string, workspaceId: string): Promise<KpiDefinitionResponseDto> {
    const definition = await this.repository.findDefinitionById(id, workspaceId);
    if (!definition) {
      throw new NotFoundException(`KPI definition ${id} not found`);
    }

    return definition as KpiDefinitionResponseDto;
  }

  async getDefinitionByKey(kpiKey: string, workspaceId?: string): Promise<KpiDefinitionResponseDto> {
    const definition = await this.repository.findDefinitionByKey(kpiKey, workspaceId);
    if (!definition) {
      throw new NotFoundException(`KPI ${kpiKey} not found`);
    }

    return definition as KpiDefinitionResponseDto;
  }

  async getAllDefinitions(filter: KpiFilterDto): Promise<{
    definitions: KpiDefinitionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;

    const { definitions, total } = await this.repository.findAllDefinitions({
      ...filter,
      page,
      limit,
    });

    return {
      definitions: definitions as KpiDefinitionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async enableDefinition(id: string, workspaceId: string): Promise<KpiDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`KPI definition ${id} not found`);
    }

    const enabled = await this.repository.enableDefinition(id, workspaceId);

    await this.eventQueue.publish({
      event: KpiEventType.KPI_ENABLED,
      workspaceId,
      kpiDefinitionId: id,
      kpiKey: existing.kpiKey,
      timestamp: new Date(),
    });

    return enabled as KpiDefinitionResponseDto;
  }

  async disableDefinition(id: string, workspaceId: string): Promise<KpiDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`KPI definition ${id} not found`);
    }

    const disabled = await this.repository.disableDefinition(id, workspaceId);

    await this.eventQueue.publish({
      event: KpiEventType.KPI_DISABLED,
      workspaceId,
      kpiDefinitionId: id,
      kpiKey: existing.kpiKey,
      timestamp: new Date(),
    });

    return disabled as KpiDefinitionResponseDto;
  }

  async archiveDefinition(id: string, workspaceId: string): Promise<KpiDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`KPI definition ${id} not found`);
    }

    const archived = await this.repository.archiveDefinition(id, workspaceId);

    await this.eventQueue.publish({
      event: KpiEventType.KPI_ARCHIVED,
      workspaceId,
      kpiDefinitionId: id,
      kpiKey: existing.kpiKey,
      timestamp: new Date(),
    });

    return archived as KpiDefinitionResponseDto;
  }

  async calculateKpi(dto: CalculateKpiDto): Promise<KpiCalculationResultResponseDto> {
    const definition = await this.repository.findDefinitionById(dto.kpiDefinitionId, dto.workspaceId);
    if (!definition) {
      throw new NotFoundException(`KPI definition ${dto.kpiDefinitionId} not found`);
    }

    const cacheKey = this.buildCacheKey(definition.kpiKey, dto.periodStart, dto.periodEnd, dto.dimensions);

    if (definition.cacheEnabled && !dto.forceRecalculate) {
      const cached = await this.repository.getCachedValue(dto.workspaceId, cacheKey);
      if (cached) {
        return this.mapValueToCalculationResult(cached);
      }
    }

    const result = await this.performCalculation(definition, dto);

    const value = await this.repository.createValue({
      kpiDefinitionId: dto.kpiDefinitionId,
      workspaceId: dto.workspaceId,
      kpiKey: definition.kpiKey,
      value: result.value,
      targetValue: result.targetValue,
      variance: result.variance,
      variancePercent: result.variancePercent,
      previousValue: result.previousValue,
      changeAmount: result.changeAmount,
      changePercent: result.changePercent,
      healthStatus: result.healthStatus,
      trendDirection: result.trendDirection,
      dimensions: dto.dimensions,
      calculatedAt: new Date(),
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      metadata: result.metadata,
    });

    await this.repository.createHistory({
      kpiDefinitionId: dto.kpiDefinitionId,
      workspaceId: dto.workspaceId,
      kpiKey: definition.kpiKey,
      value: result.value,
      targetValue: result.targetValue,
      variance: result.variance,
      variancePercent: result.variancePercent,
      healthStatus: result.healthStatus,
      trendDirection: result.trendDirection,
      dimensions: dto.dimensions,
      recordedAt: new Date(),
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });

    if (definition.cacheEnabled) {
      await this.repository.setCachedValue(
        dto.workspaceId,
        cacheKey,
        value,
        definition.cacheTtlMinutes || 15,
      );
    }

    await this.checkThresholds(definition, result.value, dto.workspaceId);

    await this.eventQueue.publish({
      event: KpiEventType.KPI_CALCULATED,
      workspaceId: dto.workspaceId,
      kpiDefinitionId: dto.kpiDefinitionId,
      kpiKey: definition.kpiKey,
      timestamp: new Date(),
      metadata: { value: result.value },
    });

    return result;
  }

  async createSnapshot(dto: CreateKpiSnapshotDto): Promise<KpiSnapshotResponseDto> {
    const definition = await this.repository.findDefinitionById(dto.kpiDefinitionId, dto.workspaceId);
    if (!definition) {
      throw new NotFoundException(`KPI definition ${dto.kpiDefinitionId} not found`);
    }

    const values = await this.repository.findValuesByDefinitionId(
      dto.kpiDefinitionId,
      dto.workspaceId,
      dto.periodStart,
      dto.periodEnd,
    );

    const aggregatedValue = values.reduce((sum, v) => sum + v.value, 0) / (values.length || 1);
    const avgVariance = values.reduce((sum, v) => sum + (v.variance || 0), 0) / (values.length || 1);
    const avgVariancePercent = values.reduce((sum, v) => sum + (v.variancePercent || 0), 0) / (values.length || 1);

    const healthStatuses = values.map(v => v.healthStatus);
    const worstHealth = this.determineWorstHealthStatus(healthStatuses);

    const trendDirections = values.map(v => v.trendDirection);
    const overallTrend = this.determineOverallTrend(trendDirections);

    const snapshot = await this.repository.createSnapshot({
      kpiDefinitionId: dto.kpiDefinitionId,
      workspaceId: dto.workspaceId,
      kpiKey: definition.kpiKey,
      snapshotKey: dto.snapshotKey,
      values,
      aggregatedValue,
      targetValue: definition.target?.value,
      variance: avgVariance,
      variancePercent: avgVariancePercent,
      healthStatus: worstHealth,
      trendDirection: overallTrend,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      metadata: dto.metadata,
    });

    await this.eventQueue.publish({
      event: KpiEventType.SNAPSHOT_CREATED,
      workspaceId: dto.workspaceId,
      kpiDefinitionId: dto.kpiDefinitionId,
      kpiKey: definition.kpiKey,
      timestamp: new Date(),
      metadata: { snapshotKey: dto.snapshotKey },
    });

    return snapshot as KpiSnapshotResponseDto;
  }

  async getVersions(kpiDefinitionId: string, workspaceId: string): Promise<KpiVersionResponseDto[]> {
    const definition = await this.repository.findDefinitionById(kpiDefinitionId, workspaceId);
    if (!definition) {
      throw new NotFoundException(`KPI definition ${kpiDefinitionId} not found`);
    }

    const versions = await this.repository.findVersionsByDefinitionId(kpiDefinitionId);
    return versions as KpiVersionResponseDto[];
  }

  async getHistory(
    kpiDefinitionId: string,
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
  ): Promise<KpiHistoryResponseDto[]> {
    const definition = await this.repository.findDefinitionById(kpiDefinitionId, workspaceId);
    if (!definition) {
      throw new NotFoundException(`KPI definition ${kpiDefinitionId} not found`);
    }

    const history = await this.repository.findHistoryByDefinitionId(
      kpiDefinitionId,
      workspaceId,
      startDate,
      endDate,
      limit,
    );

    return history as KpiHistoryResponseDto[];
  }

  async createGroup(dto: CreateKpiGroupDto): Promise<KpiGroupResponseDto> {
    const group = await this.repository.createGroup(dto);
    return group as KpiGroupResponseDto;
  }

  async updateGroup(id: string, workspaceId: string, dto: UpdateKpiGroupDto): Promise<KpiGroupResponseDto> {
    const existing = await this.repository.findGroupById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`KPI group ${id} not found`);
    }

    const updated = await this.repository.updateGroup(id, dto);
    return updated as KpiGroupResponseDto;
  }

  async getGroupById(id: string, workspaceId: string): Promise<KpiGroupResponseDto> {
    const group = await this.repository.findGroupById(id, workspaceId);
    if (!group) {
      throw new NotFoundException(`KPI group ${id} not found`);
    }

    return group as KpiGroupResponseDto;
  }

  async getAllGroups(workspaceId?: string): Promise<KpiGroupResponseDto[]> {
    const groups = await this.repository.findAllGroups(workspaceId);
    return groups as KpiGroupResponseDto[];
  }

  async deleteGroup(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findGroupById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`KPI group ${id} not found`);
    }

    await this.repository.deleteGroup(id, workspaceId);
  }

  async getAlerts(workspaceId: string, acknowledged?: boolean): Promise<KpiAlertResponseDto[]> {
    const alerts = await this.repository.findAlertsByWorkspace(workspaceId, acknowledged);
    return alerts as KpiAlertResponseDto[];
  }

  async acknowledgeAlert(id: string, dto: AcknowledgeKpiAlertDto): Promise<KpiAlertResponseDto> {
    const alert = await this.repository.acknowledgeAlert(id, dto.acknowledgedBy);
    return alert as KpiAlertResponseDto;
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCache(workspaceId, pattern);
  }

  private async performCalculation(
    definition: any,
    dto: CalculateKpiDto,
  ): Promise<KpiCalculationResultResponseDto> {
    const value = 0;
    const targetValue = definition.target?.value;
    const previousValue = 0;

    const variance = targetValue !== undefined ? value - targetValue : undefined;
    const variancePercent = targetValue && targetValue !== 0
      ? ((value - targetValue) / targetValue) * 100
      : undefined;

    const changeAmount = previousValue !== undefined ? value - previousValue : undefined;
    const changePercent = previousValue && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

    const healthStatus = this.determineHealthStatus(value, definition.thresholds || []);
    const trendDirection = this.determineTrendDirection(changePercent);

    return {
      kpiDefinitionId: definition.id,
      kpiKey: definition.kpiKey,
      value,
      targetValue,
      variance,
      variancePercent,
      previousValue,
      changeAmount,
      changePercent,
      healthStatus,
      trendDirection,
      calculatedAt: new Date(),
      metadata: {},
    };
  }

  private determineHealthStatus(value: number, thresholds: IKpiThreshold[]): KpiHealthStatus {
    for (const threshold of thresholds) {
      if (this.checkThresholdCondition(value, threshold)) {
        return threshold.healthStatus;
      }
    }

    return KpiHealthStatus.UNKNOWN;
  }

  private checkThresholdCondition(value: number, threshold: IKpiThreshold): boolean {
    switch (threshold.operator) {
      case KpiThresholdOperator.GREATER_THAN:
        return value > threshold.value;
      case KpiThresholdOperator.GREATER_THAN_OR_EQUAL:
        return value >= threshold.value;
      case KpiThresholdOperator.LESS_THAN:
        return value < threshold.value;
      case KpiThresholdOperator.LESS_THAN_OR_EQUAL:
        return value <= threshold.value;
      case KpiThresholdOperator.EQUALS:
        return value === threshold.value;
      case KpiThresholdOperator.NOT_EQUALS:
        return value !== threshold.value;
      case KpiThresholdOperator.BETWEEN:
        return threshold.value2 !== undefined && value >= threshold.value && value <= threshold.value2;
      case KpiThresholdOperator.OUTSIDE:
        return threshold.value2 !== undefined && (value < threshold.value || value > threshold.value2);
      default:
        return false;
    }
  }

  private determineTrendDirection(changePercent?: number): KpiTrendDirection {
    if (changePercent === undefined) return KpiTrendDirection.UNKNOWN;
    if (changePercent > 5) return KpiTrendDirection.UP;
    if (changePercent < -5) return KpiTrendDirection.DOWN;
    return KpiTrendDirection.STABLE;
  }

  private determineWorstHealthStatus(statuses: KpiHealthStatus[]): KpiHealthStatus {
    if (statuses.includes(KpiHealthStatus.CRITICAL)) return KpiHealthStatus.CRITICAL;
    if (statuses.includes(KpiHealthStatus.WARNING)) return KpiHealthStatus.WARNING;
    if (statuses.includes(KpiHealthStatus.GOOD)) return KpiHealthStatus.GOOD;
    if (statuses.includes(KpiHealthStatus.EXCELLENT)) return KpiHealthStatus.EXCELLENT;
    return KpiHealthStatus.UNKNOWN;
  }

  private determineOverallTrend(trends: KpiTrendDirection[]): KpiTrendDirection {
    const upCount = trends.filter(t => t === KpiTrendDirection.UP).length;
    const downCount = trends.filter(t => t === KpiTrendDirection.DOWN).length;

    if (upCount > downCount) return KpiTrendDirection.UP;
    if (downCount > upCount) return KpiTrendDirection.DOWN;
    return KpiTrendDirection.STABLE;
  }

  private async checkThresholds(definition: any, value: number, workspaceId: string): Promise<void> {
    if (!definition.thresholds) return;

    for (const threshold of definition.thresholds) {
      if (threshold.alertEnabled && this.checkThresholdCondition(value, threshold)) {
        await this.repository.createAlert({
          kpiDefinitionId: definition.id,
          workspaceId,
          kpiKey: definition.kpiKey,
          thresholdName: threshold.name,
          severity: threshold.alertSeverity || 'warning',
          value,
          thresholdValue: threshold.value,
          message: `KPI ${definition.name} exceeded threshold ${threshold.name}: ${value} (threshold: ${threshold.value})`,
          metadata: {},
        });

        await this.eventQueue.publish({
          event: KpiEventType.THRESHOLD_EXCEEDED,
          workspaceId,
          kpiDefinitionId: definition.id,
          kpiKey: definition.kpiKey,
          timestamp: new Date(),
          metadata: { threshold: threshold.name, value, thresholdValue: threshold.value },
        });
      }
    }
  }

  private buildCacheKey(kpiKey: string, periodStart: Date, periodEnd: Date, dimensions?: Record<string, any>): string {
    const parts = [
      'kpi',
      kpiKey,
      periodStart.toISOString().split('T')[0],
      periodEnd.toISOString().split('T')[0],
    ];

    if (dimensions) {
      const dimKey = Object.keys(dimensions).sort().map(k => `${k}:${dimensions[k]}`).join(',');
      parts.push(dimKey);
    }

    return parts.join(':');
  }

  private mapValueToCalculationResult(value: any): KpiCalculationResultResponseDto {
    return {
      kpiDefinitionId: value.kpiDefinitionId,
      kpiKey: value.kpiKey,
      value: value.value,
      targetValue: value.targetValue,
      variance: value.variance,
      variancePercent: value.variancePercent,
      previousValue: value.previousValue,
      changeAmount: value.changeAmount,
      changePercent: value.changePercent,
      healthStatus: value.healthStatus,
      trendDirection: value.trendDirection,
      calculatedAt: value.calculatedAt,
      metadata: value.metadata,
    };
  }
}
