import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataAggregationEngineRepository } from './data-aggregation-engine.repository';
import { DataAggregationEventQueue } from './jobs';
import {
  CreateAggregationDefinitionDto,
  UpdateAggregationDefinitionDto,
  ExecuteAggregationDto,
  BackfillAggregationDto,
  DefinitionFilterDto,
  ExecutionFilterDto,
  AggregationDefinitionResponseDto,
  AggregationExecutionResponseDto,
  AggregationSnapshotResponseDto,
  PaginatedDefinitionResponseDto,
  PaginatedExecutionResponseDto,
} from './dto';
import {
  AggregationStatus,
  AggregationEventType,
  IAggregationDefinition,
  IAggregationExecution,
  IMeasure,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class DataAggregationEngineService {
  private readonly logger = new Logger(DataAggregationEngineService.name);

  constructor(
    private readonly repository: DataAggregationEngineRepository,
    private readonly eventQueue: DataAggregationEventQueue,
  ) {}

  async createDefinition(dto: CreateAggregationDefinitionDto): Promise<AggregationDefinitionResponseDto> {
    const definition = await this.repository.createDefinition(dto);

    await this.eventQueue.publish({
      event: AggregationEventType.AGGREGATION_REQUESTED,
      workspaceId: definition.workspaceId,
      definitionId: definition.id,
      definitionKey: definition.definitionKey,
      timestamp: new Date(),
    });

    return definition as AggregationDefinitionResponseDto;
  }

  async updateDefinition(
    id: string,
    workspaceId: string,
    dto: UpdateAggregationDefinitionDto,
  ): Promise<AggregationDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const updated = await this.repository.updateDefinition(id, dto);

    await this.repository.invalidateSnapshots(id, workspaceId);

    await this.eventQueue.publish({
      event: AggregationEventType.AGGREGATION_INVALIDATED,
      workspaceId: updated.workspaceId,
      definitionId: updated.id,
      definitionKey: updated.definitionKey,
      timestamp: new Date(),
    });

    return updated as AggregationDefinitionResponseDto;
  }

  async getDefinitionById(id: string, workspaceId: string): Promise<AggregationDefinitionResponseDto> {
    const definition = await this.repository.findDefinitionById(id, workspaceId);
    if (!definition) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return definition as AggregationDefinitionResponseDto;
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
      data: definitions as AggregationDefinitionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async enableDefinition(id: string, workspaceId: string): Promise<AggregationDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (existing.enabled) {
      throw new BusinessRuleException(
        'Definition is already enabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const enabled = await this.repository.enableDefinition(id, workspaceId);
    return enabled as AggregationDefinitionResponseDto;
  }

  async disableDefinition(id: string, workspaceId: string): Promise<AggregationDefinitionResponseDto> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (!existing.enabled) {
      throw new BusinessRuleException(
        'Definition is already disabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const disabled = await this.repository.disableDefinition(id, workspaceId);
    return disabled as AggregationDefinitionResponseDto;
  }

  async deleteDefinition(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findDefinitionById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.repository.deleteDefinition(id, workspaceId);
  }

  async executeAggregation(dto: ExecuteAggregationDto): Promise<AggregationExecutionResponseDto> {
    const definition = await this.repository.findDefinitionById(dto.definitionId, dto.workspaceId);
    if (!definition) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${dto.definitionId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (!definition.enabled) {
      throw new BusinessRuleException(
        'Definition is disabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (!dto.forceRefresh) {
      const existingSnapshot = await this.repository.findLatestSnapshot(
        dto.definitionId,
        dto.workspaceId,
        dto.periodStart,
        dto.periodEnd,
      );

      if (existingSnapshot) {
        const execution = await this.repository.findExecutionById(
          existingSnapshot.executionId,
          dto.workspaceId,
        );
        return execution as AggregationExecutionResponseDto;
      }
    }

    const runningExecutions = await this.repository.findRunningExecutions(
      dto.definitionId,
      dto.workspaceId,
    );

    if (runningExecutions.length > 0) {
      throw new BusinessRuleException(
        'Aggregation is already running',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const execution = await this.repository.createExecution({
      definitionId: definition.id,
      workspaceId: definition.workspaceId,
      definitionKey: definition.definitionKey,
      mode: definition.mode,
      timeBucket: definition.timeBucket,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
    });

    await this.eventQueue.publish({
      event: AggregationEventType.AGGREGATION_STARTED,
      workspaceId: execution.workspaceId,
      definitionId: definition.id,
      definitionKey: definition.definitionKey,
      executionId: execution.id,
      timestamp: new Date(),
    });

    setImmediate(() => this.processAggregation(definition, execution));

    return execution as AggregationExecutionResponseDto;
  }

  async backfillAggregation(dto: BackfillAggregationDto): Promise<void> {
    const definition = await this.repository.findDefinitionById(dto.definitionId, dto.workspaceId);
    if (!definition) {
      throw new ResourceNotFoundException(
        `Aggregation definition ${dto.definitionId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.eventQueue.publish({
      event: AggregationEventType.BACKFILL_STARTED,
      workspaceId: definition.workspaceId,
      definitionId: definition.id,
      definitionKey: definition.definitionKey,
      timestamp: new Date(),
      metadata: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });

    const periods = this.generatePeriods(dto.startDate, dto.endDate, definition.timeBucket);

    for (const period of periods) {
      await this.executeAggregation({
        definitionId: dto.definitionId,
        workspaceId: dto.workspaceId,
        periodStart: period.start,
        periodEnd: period.end,
        forceRefresh: true,
        executedBy: dto.executedBy,
      });
    }

    await this.eventQueue.publish({
      event: AggregationEventType.BACKFILL_COMPLETED,
      workspaceId: definition.workspaceId,
      definitionId: definition.id,
      definitionKey: definition.definitionKey,
      timestamp: new Date(),
    });
  }

  async getExecution(id: string, workspaceId: string): Promise<AggregationExecutionResponseDto> {
    const execution = await this.repository.findExecutionById(id, workspaceId);
    if (!execution) {
      throw new ResourceNotFoundException(
        `Aggregation execution ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return execution as AggregationExecutionResponseDto;
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
      data: executions as AggregationExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSnapshot(id: string, workspaceId: string): Promise<AggregationSnapshotResponseDto> {
    const snapshot = await this.repository.findSnapshotById(id, workspaceId);
    if (!snapshot) {
      throw new ResourceNotFoundException(
        `Aggregation snapshot ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return snapshot as AggregationSnapshotResponseDto;
  }

  async getSnapshotsByDefinition(
    definitionId: string,
    workspaceId: string,
    limit?: number,
  ): Promise<AggregationSnapshotResponseDto[]> {
    const snapshots = await this.repository.findSnapshotsByDefinition(
      definitionId,
      workspaceId,
      limit,
    );
    return snapshots as AggregationSnapshotResponseDto[];
  }

  private async processAggregation(
    definition: IAggregationDefinition,
    execution: IAggregationExecution,
  ): Promise<void> {
    const startTime = new Date();

    await this.repository.updateExecution(execution.id, {
      status: AggregationStatus.RUNNING,
      startedAt: startTime,
    });

    try {
      const cursor = await this.repository.getCursor(definition.id, definition.workspaceId);

      const measures = await this.aggregateData(definition, execution, cursor?.position || '0');

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const snapshot = await this.repository.createSnapshot({
        definitionId: definition.id,
        executionId: execution.id,
        workspaceId: definition.workspaceId,
        definitionKey: definition.definitionKey,
        timeBucket: definition.timeBucket,
        periodStart: execution.periodStart,
        periodEnd: execution.periodEnd,
        version: definition.version,
        measures,
        recordCount: measures.length,
      });

      await this.repository.updateExecution(execution.id, {
        status: AggregationStatus.COMPLETED,
        completedAt: endTime,
        duration,
        eventsProcessed: measures.length,
        recordsAggregated: measures.length,
        snapshotId: snapshot.id,
      });

      await this.repository.updateCursor({
        definitionId: definition.id,
        workspaceId: definition.workspaceId,
        definitionKey: definition.definitionKey,
        lastProcessedTimestamp: endTime,
        position: measures.length.toString(),
      });

      await this.eventQueue.publish({
        event: AggregationEventType.SNAPSHOT_CREATED,
        workspaceId: execution.workspaceId,
        definitionId: definition.id,
        executionId: execution.id,
        timestamp: new Date(),
        metadata: { snapshotId: snapshot.id },
      });

      await this.eventQueue.publish({
        event: AggregationEventType.AGGREGATION_COMPLETED,
        workspaceId: execution.workspaceId,
        definitionId: definition.id,
        definitionKey: definition.definitionKey,
        executionId: execution.id,
        timestamp: new Date(),
        metadata: { duration, recordCount: measures.length },
      });
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.repository.updateExecution(execution.id, {
        status: AggregationStatus.FAILED,
        completedAt: endTime,
        duration,
        errorCode: (error as any)?.code || 'AGGREGATION_FAILED',
        errorMessage: (error as Error).message,
        errorStack: (error as Error).stack,
      });

      await this.eventQueue.publish({
        event: AggregationEventType.AGGREGATION_FAILED,
        workspaceId: execution.workspaceId,
        definitionId: definition.id,
        definitionKey: definition.definitionKey,
        executionId: execution.id,
        timestamp: new Date(),
        metadata: {
          errorCode: (error as any)?.code || 'AGGREGATION_FAILED',
          errorMessage: (error as Error).message,
        },
      });
    }
  }

  private async aggregateData(
    definition: IAggregationDefinition,
    execution: IAggregationExecution,
    cursorPosition: string,
  ): Promise<IMeasure[]> {
    const measures: IMeasure[] = [];

    for (const metric of definition.metrics) {
      measures.push({
        metricKey: metric.key,
        dimensions: definition.dimensions.map(d => d.type),
        timeBucket: definition.timeBucket,
        value: Math.random() * 1000,
        count: Math.floor(Math.random() * 100),
        metadata: {},
      });
    }

    return measures;
  }

  private generatePeriods(
    startDate: Date,
    endDate: Date,
    timeBucket: any,
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = [];
    let current = new Date(startDate);

    while (current < endDate) {
      const periodEnd = new Date(current);

      switch (timeBucket) {
        case 'daily':
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'weekly':
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'monthly':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
        case 'quarterly':
          periodEnd.setMonth(periodEnd.getMonth() + 3);
          break;
        case 'yearly':
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          break;
      }

      periods.push({
        start: new Date(current),
        end: periodEnd > endDate ? endDate : periodEnd,
      });

      current = periodEnd;
    }

    return periods;
  }
}
