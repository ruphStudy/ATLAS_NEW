import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScheduledReportsRepository } from './scheduled-reports.repository';
import { ScheduledReportsEventQueue } from './jobs';
import { ReportBuilderService } from '@modules/report-builder/report-builder.service';
import {
  CreateReportScheduleDto,
  UpdateReportScheduleDto,
  ExecuteScheduleDto,
  ScheduleFilterDto,
  ExecutionFilterDto,
  ReportScheduleResponseDto,
  ScheduleExecutionResponseDto,
  PaginatedScheduleResponseDto,
  PaginatedExecutionResponseDto,
} from './dto';
import {
  ScheduleStatus,
  ExecutionStatus,
  ScheduledReportEvent,
  IReportSchedule,
  IScheduleExecution,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly repository: ScheduledReportsRepository,
    private readonly eventQueue: ScheduledReportsEventQueue,
    private readonly reportBuilderService: ReportBuilderService,
  ) {}

  async createSchedule(dto: CreateReportScheduleDto): Promise<ReportScheduleResponseDto> {
    await this.reportBuilderService.getDefinitionById(dto.reportDefinitionId, dto.workspaceId);

    const schedule = await this.repository.createSchedule({
      ...dto,
      status: ScheduleStatus.ACTIVE,
    });

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_CREATED,
      workspaceId: schedule.workspaceId,
      scheduleId: schedule.id,
      scheduleKey: schedule.scheduleKey,
      timestamp: new Date(),
    });

    return schedule as ReportScheduleResponseDto;
  }

  async updateSchedule(
    id: string,
    workspaceId: string,
    dto: UpdateReportScheduleDto,
  ): Promise<ReportScheduleResponseDto> {
    const existing = await this.repository.findScheduleById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const updated = await this.repository.updateSchedule(id, dto);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_UPDATED,
      workspaceId: updated.workspaceId,
      scheduleId: updated.id,
      scheduleKey: updated.scheduleKey,
      timestamp: new Date(),
    });

    return updated as ReportScheduleResponseDto;
  }

  async getScheduleById(id: string, workspaceId: string): Promise<ReportScheduleResponseDto> {
    const schedule = await this.repository.findScheduleById(id, workspaceId);
    if (!schedule) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return schedule as ReportScheduleResponseDto;
  }

  async getAllSchedules(filter: ScheduleFilterDto): Promise<PaginatedScheduleResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { schedules, total } = await this.repository.findAllSchedules({
      ...filter,
      page,
      limit,
    });

    return {
      data: schedules as ReportScheduleResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async enableSchedule(id: string, workspaceId: string): Promise<ReportScheduleResponseDto> {
    const existing = await this.repository.findScheduleById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (existing.enabled) {
      throw new BusinessRuleException(
        'Schedule is already enabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const enabled = await this.repository.enableSchedule(id, workspaceId);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_ENABLED,
      workspaceId: enabled.workspaceId,
      scheduleId: enabled.id,
      scheduleKey: enabled.scheduleKey,
      timestamp: new Date(),
    });

    return enabled as ReportScheduleResponseDto;
  }

  async disableSchedule(id: string, workspaceId: string): Promise<ReportScheduleResponseDto> {
    const existing = await this.repository.findScheduleById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (!existing.enabled) {
      throw new BusinessRuleException(
        'Schedule is already disabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const disabled = await this.repository.disableSchedule(id, workspaceId);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_DISABLED,
      workspaceId: disabled.workspaceId,
      scheduleId: disabled.id,
      scheduleKey: disabled.scheduleKey,
      timestamp: new Date(),
    });

    return disabled as ReportScheduleResponseDto;
  }

  async pauseSchedule(id: string, workspaceId: string): Promise<ReportScheduleResponseDto> {
    const existing = await this.repository.findScheduleById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (existing.paused) {
      throw new BusinessRuleException(
        'Schedule is already paused',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const paused = await this.repository.pauseSchedule(id, workspaceId);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_PAUSED,
      workspaceId: paused.workspaceId,
      scheduleId: paused.id,
      scheduleKey: paused.scheduleKey,
      timestamp: new Date(),
    });

    return paused as ReportScheduleResponseDto;
  }

  async resumeSchedule(id: string, workspaceId: string): Promise<ReportScheduleResponseDto> {
    const existing = await this.repository.findScheduleById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (!existing.paused) {
      throw new BusinessRuleException(
        'Schedule is not paused',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const resumed = await this.repository.resumeSchedule(id, workspaceId);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_RESUMED,
      workspaceId: resumed.workspaceId,
      scheduleId: resumed.id,
      scheduleKey: resumed.scheduleKey,
      timestamp: new Date(),
    });

    return resumed as ReportScheduleResponseDto;
  }

  async deleteSchedule(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findScheduleById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Schedule ${id} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.repository.deleteSchedule(id, workspaceId);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.SCHEDULE_DELETED,
      workspaceId: existing.workspaceId,
      scheduleId: existing.id,
      scheduleKey: existing.scheduleKey,
      timestamp: new Date(),
    });
  }

  async executeSchedule(dto: ExecuteScheduleDto): Promise<ScheduleExecutionResponseDto> {
    const schedule = await this.repository.findScheduleById(dto.scheduleId, dto.workspaceId);
    if (!schedule) {
      throw new ResourceNotFoundException(
        `Schedule ${dto.scheduleId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (!schedule.enabled && !dto.isManual) {
      throw new BusinessRuleException(
        'Schedule is disabled',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (schedule.paused && !dto.isManual) {
      throw new BusinessRuleException(
        'Schedule is paused',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (!schedule.allowConcurrentExecution && !dto.isManual) {
      const runningExecutions = await this.repository.findRunningExecutions(
        schedule.id,
        dto.workspaceId,
      );
      if (runningExecutions.length > 0) {
        this.logger.warn(
          `Skipping execution for schedule ${schedule.id} - concurrent execution already running`,
        );
        throw new BusinessRuleException(
          'Concurrent execution not allowed',
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }
    }

    const execution = await this.repository.createExecution({
      scheduleId: schedule.id,
      workspaceId: schedule.workspaceId,
      reportDefinitionId: schedule.reportDefinitionId,
      scheduleKey: schedule.scheduleKey,
      scheduledAt: new Date(),
      isManual: dto.isManual ?? false,
      isMissedRunRecovery: false,
      attemptNumber: 1,
    });

    await this.eventQueue.publish({
      event: ScheduledReportEvent.EXECUTION_SCHEDULED,
      workspaceId: execution.workspaceId,
      scheduleId: schedule.id,
      scheduleKey: schedule.scheduleKey,
      executionId: execution.id,
      timestamp: new Date(),
    });

    await this.processExecution(schedule, execution);

    return execution as ScheduleExecutionResponseDto;
  }

  async processExecution(schedule: IReportSchedule, execution: IScheduleExecution): Promise<void> {
    const startTime = new Date();

    await this.repository.updateExecution(execution.id, {
      status: ExecutionStatus.GENERATING,
      startedAt: startTime,
    });

    await this.eventQueue.publish({
      event: ScheduledReportEvent.EXECUTION_STARTED,
      workspaceId: execution.workspaceId,
      scheduleId: schedule.id,
      scheduleKey: schedule.scheduleKey,
      executionId: execution.id,
      timestamp: new Date(),
    });

    let attemptNumber = execution.attemptNumber;
    let lastError: Error | null = null;

    while (attemptNumber <= schedule.maxRetries) {
      try {
        await this.repository.createExecutionLog({
          executionId: execution.id,
          workspaceId: execution.workspaceId,
          level: 'info',
          message: `Starting execution attempt ${attemptNumber}`,
        });

        const generationStartTime = new Date();

        await this.eventQueue.publish({
          event: ScheduledReportEvent.GENERATION_STARTED,
          workspaceId: execution.workspaceId,
          scheduleId: schedule.id,
          executionId: execution.id,
          timestamp: new Date(),
        });

        const reportResult = await this.reportBuilderService.executeReport({
          reportDefinitionId: schedule.reportDefinitionId,
          workspaceId: schedule.workspaceId,
          filters: schedule.reportFilters,
          dateRange: schedule.reportDateRange,
          executedBy: schedule.createdBy,
        });

        const generationEndTime = new Date();
        const generationDuration = generationEndTime.getTime() - generationStartTime.getTime();

        await this.repository.updateExecution(execution.id, {
          generationStartedAt: generationStartTime,
          generationCompletedAt: generationEndTime,
          generationDuration,
          reportExecutionId: reportResult.executionId,
        });

        await this.eventQueue.publish({
          event: ScheduledReportEvent.GENERATION_COMPLETED,
          workspaceId: execution.workspaceId,
          scheduleId: schedule.id,
          executionId: execution.id,
          timestamp: new Date(),
          metadata: { reportExecutionId: reportResult.executionId },
        });

        const deliveryStartTime = new Date();

        await this.eventQueue.publish({
          event: ScheduledReportEvent.DELIVERY_STARTED,
          workspaceId: execution.workspaceId,
          scheduleId: schedule.id,
          executionId: execution.id,
          timestamp: new Date(),
        });

        const outputReferences = await this.deliverReport(schedule, reportResult);

        const deliveryEndTime = new Date();
        const deliveryDuration = deliveryEndTime.getTime() - deliveryStartTime.getTime();

        await this.repository.updateExecution(execution.id, {
          deliveryStartedAt: deliveryStartTime,
          deliveryCompletedAt: deliveryEndTime,
          deliveryDuration,
          outputReferences,
        });

        await this.eventQueue.publish({
          event: ScheduledReportEvent.DELIVERY_COMPLETED,
          workspaceId: execution.workspaceId,
          scheduleId: schedule.id,
          executionId: execution.id,
          timestamp: new Date(),
        });

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        await this.repository.updateExecution(execution.id, {
          status: ExecutionStatus.COMPLETED,
          completedAt: endTime,
          duration,
        });

        await this.repository.updateLastRun(schedule.id, endTime, ExecutionStatus.COMPLETED);
        await this.repository.incrementExecutionCount(schedule.id, true);

        await this.eventQueue.publish({
          event: ScheduledReportEvent.EXECUTION_COMPLETED,
          workspaceId: execution.workspaceId,
          scheduleId: schedule.id,
          scheduleKey: schedule.scheduleKey,
          executionId: execution.id,
          timestamp: new Date(),
          metadata: { duration },
        });

        return;
      } catch (error) {
        lastError = error as Error;

        this.logger.warn(
          `Execution attempt ${attemptNumber} failed for schedule ${schedule.id}: ${error.message}`,
        );

        await this.repository.createExecutionLog({
          executionId: execution.id,
          workspaceId: execution.workspaceId,
          level: 'error',
          message: `Execution attempt ${attemptNumber} failed: ${error.message}`,
          context: { errorStack: (error as Error).stack },
        });

        if (attemptNumber >= schedule.maxRetries) {
          break;
        }

        await this.eventQueue.publish({
          event: ScheduledReportEvent.EXECUTION_RETRYING,
          workspaceId: execution.workspaceId,
          scheduleId: schedule.id,
          executionId: execution.id,
          timestamp: new Date(),
          metadata: { attemptNumber, errorMessage: error.message },
        });

        const delayMs = this.calculateRetryDelay(attemptNumber, schedule.retryBackoff);
        await this.delay(delayMs);

        attemptNumber++;
        await this.repository.updateExecution(execution.id, {
          attemptNumber,
          retriedAt: new Date(),
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    await this.repository.updateExecution(execution.id, {
      status: ExecutionStatus.FAILED,
      completedAt: endTime,
      duration,
      errorCode: (lastError as any)?.code || 'EXECUTION_FAILED',
      errorMessage: lastError?.message || 'Execution failed after max retries',
      errorStack: lastError?.stack,
    });

    await this.repository.updateLastRun(schedule.id, endTime, ExecutionStatus.FAILED);
    await this.repository.incrementExecutionCount(schedule.id, false);

    await this.eventQueue.publish({
      event: ScheduledReportEvent.EXECUTION_FAILED,
      workspaceId: execution.workspaceId,
      scheduleId: schedule.id,
      scheduleKey: schedule.scheduleKey,
      executionId: execution.id,
      timestamp: new Date(),
      metadata: {
        errorCode: (lastError as any)?.code || 'EXECUTION_FAILED',
        errorMessage: lastError?.message,
      },
    });
  }

  async getExecutionHistory(
    scheduleId: string,
    workspaceId: string,
    limit?: number,
  ): Promise<ScheduleExecutionResponseDto[]> {
    const executions = await this.repository.findExecutionsBySchedule(
      scheduleId,
      workspaceId,
      limit,
    );
    return executions as ScheduleExecutionResponseDto[];
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
      data: executions as ScheduleExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async detectMissedRuns(): Promise<void> {
    const now = new Date();
    const schedules = await this.repository.findSchedulesDueForExecution(now);

    for (const schedule of schedules) {
      await this.eventQueue.publish({
        event: ScheduledReportEvent.MISSED_RUN_DETECTED,
        workspaceId: schedule.workspaceId,
        scheduleId: schedule.id,
        scheduleKey: schedule.scheduleKey,
        timestamp: new Date(),
      });

      const execution = await this.repository.createExecution({
        scheduleId: schedule.id,
        workspaceId: schedule.workspaceId,
        reportDefinitionId: schedule.reportDefinitionId,
        scheduleKey: schedule.scheduleKey,
        scheduledAt: schedule.nextRunAt!,
        isManual: false,
        isMissedRunRecovery: true,
        attemptNumber: 1,
      });

      await this.processExecution(schedule, execution);

      await this.eventQueue.publish({
        event: ScheduledReportEvent.MISSED_RUN_RECOVERED,
        workspaceId: schedule.workspaceId,
        scheduleId: schedule.id,
        scheduleKey: schedule.scheduleKey,
        timestamp: new Date(),
        metadata: { executionId: execution.id },
      });
    }
  }

  private async deliverReport(schedule: IReportSchedule, reportResult: any): Promise<any[]> {
    const outputReferences: any[] = [];

    for (const method of schedule.deliveryConfig.methods) {
      for (const format of schedule.deliveryConfig.outputFormats) {
        const reference = `${method}:${format}:${Date.now()}`;
        outputReferences.push({
          method,
          format,
          reference,
          size: 1024,
          deliveredAt: new Date(),
        });
      }
    }

    return outputReferences;
  }

  private calculateRetryDelay(attemptNumber: number, retryBackoff: any): number {
    if (retryBackoff.type === 'fixed') {
      return Math.min(retryBackoff.initialDelayMs, retryBackoff.maxDelayMs);
    }

    const delay = retryBackoff.initialDelayMs * Math.pow(retryBackoff.multiplier || 2, attemptNumber - 1);
    return Math.min(delay, retryBackoff.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
