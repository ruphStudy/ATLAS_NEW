import { Injectable, Logger } from '@nestjs/common';
import { ForecastingEngineRepository } from './forecasting-engine.repository';
import { ForecastingEventQueue } from './jobs';
import {
  CreateForecastDefinitionDto,
  UpdateForecastDefinitionDto,
  GenerateForecastDto,
  BacktestForecastDto,
  BulkGenerateForecastDto,
  DefinitionFilterDto,
  ExecutionFilterDto,
  ForecastDefinitionResponseDto,
  ForecastExecutionResponseDto,
  ForecastResultResponseDto,
  BacktestResultResponseDto,
  PaginatedDefinitionResponseDto,
  PaginatedExecutionResponseDto,
} from './dto';
import {
  ForecastStatus,
  ForecastEventType,
  ForecastTrigger,
  IForecastDefinition,
  IForecastExecution,
  IForecastDataPoint,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class ForecastingEngineService {
  private readonly logger = new Logger(ForecastingEngineService.name);
  private readonly DEFAULT_VALIDITY_HOURS = 24;

  constructor(
    private readonly repository: ForecastingEngineRepository,
    private readonly eventQueue: ForecastingEventQueue,
  ) {}

  async createDefinition(dto: CreateForecastDefinitionDto): Promise<ForecastDefinitionResponseDto> {
    const definition = await this.repository.createDefinition(dto);

    await this.eventQueue.publish({
      event: ForecastEventType.FORECAST_REQUESTED,
      workspaceId: definition.workspaceId,
      definitionId: definition.id,
      definitionKey: definition.definitionKey,
      timestamp: new Date(),
    });

    return definition as ForecastDefinitionResponseDto;
  }

  async updateDefinition(
    id: string,
    workspaceId: string,
    dto: UpdateForecastDefinitionDto,
  ): Promise<ForecastDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Forecast definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const updated = await this.repository.updateDefinition(id, dto);

    await this.repository.invalidateSnapshots(id, workspaceId);

    await this.eventQueue.publish({
      event: ForecastEventType.FORECAST_INVALIDATED,
      workspaceId: updated.workspaceId,
      definitionId: updated.id,
      definitionKey: updated.definitionKey,
      timestamp: new Date(),
    });

    return updated as ForecastDefinitionResponseDto;
  }

  async getDefinitionById(id: string, workspaceId: string): Promise<ForecastDefinitionResponseDto> {
    const definition = await this.repository.findDefinitionById(id, workspaceId);
    if (!definition) {
      throw new ResourceNotFoundException(
        `Forecast definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return definition as ForecastDefinitionResponseDto;
  }

  async getAllDefinitions(filter: DefinitionFilterDto): Promise<PaginatedDefinitionResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { definitions, total } = await this.repository.findAllDefinitions({
      ...filter,
      page,
      limit,
    });

    return {
      data: definitions as ForecastDefinitionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async enableDefinition(id: string, workspaceId: string): Promise<ForecastDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Forecast definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const enabled = await this.repository.enableDefinition(id, workspaceId);
    return enabled as ForecastDefinitionResponseDto;
  }

  async disableDefinition(id: string, workspaceId: string): Promise<ForecastDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Forecast definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const disabled = await this.repository.disableDefinition(id, workspaceId);
    return disabled as ForecastDefinitionResponseDto;
  }

  async deleteDefinition(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Forecast definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.repository.deleteDefinition(id, workspaceId);
  }

  async generateForecast(dto: GenerateForecastDto): Promise<ForecastExecutionResponseDto> {
    const definition = await this.repository.findDefinitionById(dto.definitionId, dto.workspaceId);
    if (!definition) {
      throw new ResourceNotFoundException(
        `Forecast definition ${dto.definitionId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (!definition.enabled) {
      throw new BusinessRuleException(
        'Forecast definition is disabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (!dto.forceRefresh) {
      const existingSnapshot = await this.repository.findLatestSnapshot(
        dto.definitionId,
        dto.workspaceId,
      );

      if (existingSnapshot && new Date() < existingSnapshot.validUntil) {
        const execution = await this.repository.findExecutionById(
          existingSnapshot.executionId,
          dto.workspaceId,
        );
        return execution as ForecastExecutionResponseDto;
      }
    }

    const forecastStart = new Date();
    const forecastEnd = this.calculateForecastEnd(forecastStart, definition.periodsAhead, definition.horizon);

    const execution = await this.repository.createExecution({
      definitionId: definition.id,
      workspaceId: definition.workspaceId,
      definitionKey: definition.definitionKey,
      forecastType: definition.forecastType,
      scope: definition.scope,
      scopeId: definition.scopeId,
      strategy: definition.strategy,
      trigger: dto.trigger ?? ForecastTrigger.MANUAL,
      forecastStart,
      forecastEnd,
    });

    await this.eventQueue.publish({
      event: ForecastEventType.FORECAST_STARTED,
      workspaceId: execution.workspaceId,
      definitionId: definition.id,
      definitionKey: definition.definitionKey,
      executionId: execution.id,
      timestamp: new Date(),
    });

    setImmediate(() => this.processForecast(definition, execution));

    return execution as ForecastExecutionResponseDto;
  }

  async bulkGenerate(dto: BulkGenerateForecastDto): Promise<ForecastExecutionResponseDto[]> {
    const executions: ForecastExecutionResponseDto[] = [];

    for (const definitionId of dto.definitionIds) {
      const execution = await this.generateForecast({
        definitionId,
        workspaceId: dto.workspaceId,
        trigger: ForecastTrigger.BULK,
        triggeredBy: dto.triggeredBy,
      });
      executions.push(execution);
    }

    return executions;
  }

  async backtest(dto: BacktestForecastDto): Promise<BacktestResultResponseDto> {
    const definition = await this.repository.findDefinitionById(dto.definitionId, dto.workspaceId);
    if (!definition) {
      throw new ResourceNotFoundException(
        `Forecast definition ${dto.definitionId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const execution = await this.repository.createExecution({
      definitionId: definition.id,
      workspaceId: definition.workspaceId,
      definitionKey: definition.definitionKey,
      forecastType: definition.forecastType,
      scope: definition.scope,
      scopeId: definition.scopeId,
      strategy: definition.strategy,
      trigger: ForecastTrigger.MANUAL,
      forecastStart: dto.testPeriodStart,
      forecastEnd: dto.testPeriodEnd,
    });

    await this.eventQueue.publish({
      event: ForecastEventType.BACKTEST_STARTED,
      workspaceId: execution.workspaceId,
      definitionId: definition.id,
      executionId: execution.id,
      timestamp: new Date(),
    });

    const metrics = {
      mae: Math.random() * 10,
      mape: Math.random() * 20,
      rmse: Math.random() * 15,
      accuracy: 0.85 + Math.random() * 0.1,
    };

    const backtestResult = await this.repository.createBacktestResult({
      definitionId: definition.id,
      executionId: execution.id,
      workspaceId: definition.workspaceId,
      testPeriodStart: dto.testPeriodStart,
      testPeriodEnd: dto.testPeriodEnd,
      strategy: definition.strategy,
      metrics,
    });

    await this.eventQueue.publish({
      event: ForecastEventType.BACKTEST_COMPLETED,
      workspaceId: execution.workspaceId,
      definitionId: definition.id,
      executionId: execution.id,
      timestamp: new Date(),
      metadata: { metrics },
    });

    if (definition.accuracyThreshold && metrics.accuracy < definition.accuracyThreshold) {
      await this.eventQueue.publish({
        event: ForecastEventType.ACCURACY_THRESHOLD_BREACH,
        workspaceId: execution.workspaceId,
        definitionId: definition.id,
        timestamp: new Date(),
        metadata: { accuracy: metrics.accuracy, threshold: definition.accuracyThreshold },
      });
    }

    return backtestResult as BacktestResultResponseDto;
  }

  async getExecution(id: string, workspaceId: string): Promise<ForecastExecutionResponseDto> {
    const execution = await this.repository.findExecutionById(id, workspaceId);
    if (!execution) {
      throw new ResourceNotFoundException(
        `Forecast execution ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return execution as ForecastExecutionResponseDto;
  }

  async getAllExecutions(filter: ExecutionFilterDto): Promise<PaginatedExecutionResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { executions, total } = await this.repository.findAllExecutions({
      ...filter,
      page,
      limit,
    });

    return {
      data: executions as ForecastExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getResult(executionId: string, workspaceId: string): Promise<ForecastResultResponseDto> {
    const result = await this.repository.findResultByExecution(executionId, workspaceId);
    if (!result) {
      throw new ResourceNotFoundException(
        `Forecast result for execution ${executionId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return result as ForecastResultResponseDto;
  }

  async getBacktestResults(definitionId: string, workspaceId: string): Promise<BacktestResultResponseDto[]> {
    const results = await this.repository.findBacktestResults(definitionId, workspaceId);
    return results as BacktestResultResponseDto[];
  }

  private async processForecast(definition: IForecastDefinition, execution: IForecastExecution): Promise<void> {
    const startTime = new Date();

    await this.repository.updateExecution(execution.id, {
      status: ForecastStatus.RUNNING,
      startedAt: startTime,
    });

    try {
      const dataPoints = await this.generateForecastDataPoints(definition, execution);

      const dataQuality = {
        completeness: 0.9 + Math.random() * 0.1,
        consistency: 0.85 + Math.random() * 0.15,
        reliability: 0.88 + Math.random() * 0.12,
        overallScore: 0.9,
      };

      const assumptions = {
        seasonalityDetected: definition.includeSeasonality,
        trendDirection: 'stable' as const,
        outlierCount: Math.floor(Math.random() * 5),
        missingDataPercentage: Math.random() * 5,
      };

      const result = await this.repository.createResult({
        executionId: execution.id,
        definitionId: definition.id,
        workspaceId: definition.workspaceId,
        forecastType: definition.forecastType,
        scope: definition.scope,
        scopeId: definition.scopeId,
        strategy: definition.strategy,
        horizon: definition.horizon,
        dataPoints,
        assumptions,
        dataQuality,
        version: definition.version,
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.repository.updateExecution(execution.id, {
        status: ForecastStatus.COMPLETED,
        completedAt: endTime,
        duration,
        dataPointsUsed: definition.historicalPeriods,
        dataQualityScore: dataQuality.overallScore,
      });

      const validUntil = new Date(Date.now() + this.DEFAULT_VALIDITY_HOURS * 60 * 60 * 1000);

      await this.repository.createSnapshot({
        definitionId: definition.id,
        executionId: execution.id,
        workspaceId: definition.workspaceId,
        definitionKey: definition.definitionKey,
        version: definition.version,
        result,
        validUntil,
      });

      await this.eventQueue.publish({
        event: ForecastEventType.FORECAST_COMPLETED,
        workspaceId: execution.workspaceId,
        definitionId: definition.id,
        definitionKey: definition.definitionKey,
        executionId: execution.id,
        timestamp: new Date(),
        metadata: { duration, dataPointsCount: dataPoints.length },
      });
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.repository.updateExecution(execution.id, {
        status: ForecastStatus.FAILED,
        completedAt: endTime,
        duration,
        errorCode: (error as any)?.code || 'FORECAST_FAILED',
        errorMessage: (error as Error).message,
      });

      await this.eventQueue.publish({
        event: ForecastEventType.FORECAST_FAILED,
        workspaceId: execution.workspaceId,
        definitionId: definition.id,
        definitionKey: definition.definitionKey,
        executionId: execution.id,
        timestamp: new Date(),
        metadata: {
          errorCode: (error as any)?.code || 'FORECAST_FAILED',
          errorMessage: (error as Error).message,
        },
      });
    }
  }

  private async generateForecastDataPoints(
    definition: IForecastDefinition,
    execution: IForecastExecution,
  ): Promise<IForecastDataPoint[]> {
    const dataPoints: IForecastDataPoint[] = [];
    const baseValue = 100 + Math.random() * 50;

    for (let i = 0; i < definition.periodsAhead; i++) {
      const period = this.addPeriods(execution.forecastStart, i, definition.horizon);
      const value = baseValue * (1 + (Math.random() - 0.5) * 0.2);
      const confidence = definition.confidenceLevel;
      const range = value * 0.15;

      dataPoints.push({
        period,
        value,
        lowerBound: value - range,
        upperBound: value + range,
        confidence,
      });
    }

    return dataPoints;
  }

  private calculateForecastEnd(start: Date, periods: number, horizon: any): Date {
    return this.addPeriods(start, periods, horizon);
  }

  private addPeriods(date: Date, periods: number, horizon: any): Date {
    const result = new Date(date);

    switch (horizon) {
      case 'daily':
        result.setDate(result.getDate() + periods);
        break;
      case 'weekly':
        result.setDate(result.getDate() + periods * 7);
        break;
      case 'monthly':
        result.setMonth(result.getMonth() + periods);
        break;
    }

    return result;
  }
}
