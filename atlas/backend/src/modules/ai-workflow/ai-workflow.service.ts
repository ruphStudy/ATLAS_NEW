import { Injectable, Logger } from '@nestjs/common';
import { AiWorkflowRepository } from './ai-workflow.repository';
import { AiWorkflowEventQueue } from './jobs';
import { AiOrchestratorService } from '@modules/ai-orchestrator/ai-orchestrator.service';
import { AiAgentService } from '@modules/ai-agent/ai-agent.service';
import {
  CreateAiWorkflowDto,
  UpdateAiWorkflowDto,
  AiWorkflowFilterDto,
  ExecuteWorkflowDto,
  ExecutionFilterDto,
  CreateWorkflowScheduleDto,
  UpdateWorkflowScheduleDto,
  AiWorkflowResponseDto,
  PaginatedAiWorkflowResponseDto,
  WorkflowExecutionResponseDto,
  PaginatedExecutionResponseDto,
  WorkflowScheduleResponseDto,
  ExecutionResultDto,
} from './dto';
import {
  IAiWorkflow,
  IAiWorkflowExecution,
  IAiWorkflowSchedule,
  IWorkflowStep,
  IExecutionResult,
  AiWorkflowStatus,
  AiWorkflowExecutionStatus,
  AiWorkflowStepType,
  AiWorkflowEvent,
  AiWorkflowTriggerType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiWorkflowService {
  private readonly logger = new Logger(AiWorkflowService.name);

  constructor(
    private readonly repository: AiWorkflowRepository,
    private readonly eventQueue: AiWorkflowEventQueue,
    private readonly orchestratorService: AiOrchestratorService,
    private readonly agentService: AiAgentService,
  ) {}

  async createWorkflow(dto: CreateAiWorkflowDto): Promise<IAiWorkflow> {
    const existing = await this.repository.findWorkflowByKey(
      dto.key,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Workflow with this key already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      version: 1,
      status: AiWorkflowStatus.DRAFT,
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig || null,
      steps: dto.steps,
      inputSchema: dto.inputSchema || null,
      outputSchema: dto.outputSchema || null,
      variables: dto.variables || null,
      timeout: dto.timeout,
      maxRetries: dto.maxRetries ?? 3,
      retryStrategy: dto.retryStrategy || null,
      fallbackWorkflowId: dto.fallbackWorkflowId,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      publishedAt: null,
      publishedBy: null,
      createdBy: dto.createdBy,
    };

    const workflow = (await this.repository.createWorkflow(data)) as IAiWorkflow;

    await this.eventQueue.publish({
      event: AiWorkflowEvent.WORKFLOW_CREATED,
      workspaceId: workflow.workspaceId,
      workflowId: workflow.id,
    });

    return workflow;
  }

  async updateWorkflow(
    id: string,
    workspaceId: string,
    dto: UpdateAiWorkflowDto,
  ): Promise<IAiWorkflow> {
    await this.findWorkflowById(id, workspaceId);

    const updated = (await this.repository.updateWorkflow(id, dto)) as IAiWorkflow;

    await this.eventQueue.publish({
      event: AiWorkflowEvent.WORKFLOW_UPDATED,
      workspaceId: updated.workspaceId,
      workflowId: updated.id,
    });

    return updated;
  }

  async publishWorkflow(
    id: string,
    workspaceId: string,
    publishedBy?: string,
  ): Promise<IAiWorkflow> {
    const workflow = await this.findWorkflowById(id, workspaceId);

    if (workflow.status === AiWorkflowStatus.ACTIVE) {
      throw new BusinessRuleException(
        'Workflow is already published',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const published = await this.repository.updateWorkflow(id, {
      status: AiWorkflowStatus.ACTIVE,
      publishedAt: new Date(),
      publishedBy,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.WORKFLOW_PUBLISHED,
      workspaceId: published.workspaceId,
      workflowId: published.id,
    });

    return published as IAiWorkflow;
  }

  async pauseWorkflow(id: string, workspaceId: string): Promise<IAiWorkflow> {
    const workflow = await this.findWorkflowById(id, workspaceId);

    const paused = await this.repository.updateWorkflow(id, {
      status: AiWorkflowStatus.PAUSED,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.WORKFLOW_PAUSED,
      workspaceId: paused.workspaceId,
      workflowId: paused.id,
    });

    return paused as IAiWorkflow;
  }

  async resumeWorkflow(id: string, workspaceId: string): Promise<IAiWorkflow> {
    const workflow = await this.findWorkflowById(id, workspaceId);

    const resumed = await this.repository.updateWorkflow(id, {
      status: AiWorkflowStatus.ACTIVE,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.WORKFLOW_RESUMED,
      workspaceId: resumed.workspaceId,
      workflowId: resumed.id,
    });

    return resumed as IAiWorkflow;
  }

  async archiveWorkflow(id: string, workspaceId: string): Promise<IAiWorkflow> {
    const workflow = await this.findWorkflowById(id, workspaceId);

    const archived = await this.repository.updateWorkflow(id, {
      status: AiWorkflowStatus.ARCHIVED,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.WORKFLOW_ARCHIVED,
      workspaceId: archived.workspaceId,
      workflowId: archived.id,
    });

    return archived as IAiWorkflow;
  }

  async deleteWorkflow(id: string, workspaceId: string): Promise<void> {
    await this.findWorkflowById(id, workspaceId);
    await this.repository.deleteWorkflow(id);
  }

  async findWorkflowById(id: string, workspaceId: string): Promise<IAiWorkflow> {
    const workflow = await this.repository.findWorkflowById(id, workspaceId);
    if (!workflow) {
      throw new ResourceNotFoundException(
        'Workflow not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return workflow;
  }

  async findAllWorkflows(
    filter: AiWorkflowFilterDto,
  ): Promise<PaginatedAiWorkflowResponseDto> {
    const [data, total] = await this.repository.findAllWorkflows(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiWorkflowResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async executeWorkflow(dto: ExecuteWorkflowDto): Promise<IExecutionResult> {
    const workflow = await this.findWorkflowById(dto.workflowId, dto.workspaceId);

    if (workflow.status !== AiWorkflowStatus.ACTIVE) {
      throw new BusinessRuleException(
        'Workflow is not active',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const execution = await this.repository.createExecution({
      workspaceId: dto.workspaceId,
      workflowId: dto.workflowId,
      version: workflow.version,
      triggerType: dto.triggerType ?? AiWorkflowTriggerType.MANUAL,
      triggeredBy: dto.triggeredBy,
      input: dto.input || null,
      status: AiWorkflowExecutionStatus.PENDING,
      currentStepIndex: null,
      currentStepId: null,
      variables: workflow.variables || null,
      context: {},
      startTime: new Date(),
      attemptNumber: 1,
      compensationExecuted: false,
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.EXECUTION_STARTED,
      workspaceId: dto.workspaceId,
      workflowId: dto.workflowId,
      executionId: execution.id,
    });

    try {
      const result = await this.processExecution(workflow, execution);
      return result;
    } catch (error) {
      await this.repository.updateExecution(execution.id, {
        status: AiWorkflowExecutionStatus.FAILED,
        endTime: new Date(),
        errorCode: (error as any).code || 'EXECUTION_ERROR',
        errorMessage: (error as Error).message,
      });

      await this.eventQueue.publish({
        event: AiWorkflowEvent.EXECUTION_FAILED,
        workspaceId: dto.workspaceId,
        workflowId: dto.workflowId,
        executionId: execution.id,
      });

      throw error;
    }
  }

  private async processExecution(
    workflow: IAiWorkflow,
    execution: IAiWorkflowExecution,
  ): Promise<IExecutionResult> {
    const startTime = Date.now();

    await this.repository.updateExecution(execution.id, {
      status: AiWorkflowExecutionStatus.RUNNING,
    });

    const steps = workflow.steps as IWorkflowStep[];
    let totalCost = 0;
    let totalTokens = 0;
    let stepsCompleted = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      await this.repository.updateExecution(execution.id, {
        currentStepIndex: i,
        currentStepId: step.id,
      });

      const stepResult = await this.executeStep(
        workflow,
        execution,
        step,
        i,
      );

      totalCost += stepResult.cost || 0;
      totalTokens += stepResult.tokens || 0;
      stepsCompleted++;

      if (stepResult.status === 'failed' && !step.onFailure) {
        throw new BusinessRuleException(
          `Step ${step.name} failed`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }
    }

    const duration = Date.now() - startTime;

    await this.repository.updateExecution(execution.id, {
      status: AiWorkflowExecutionStatus.COMPLETED,
      endTime: new Date(),
      totalCost,
      totalTokens,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.EXECUTION_COMPLETED,
      workspaceId: execution.workspaceId,
      workflowId: execution.workflowId,
      executionId: execution.id,
      status: 'completed',
    });

    return {
      executionId: execution.id,
      status: AiWorkflowExecutionStatus.COMPLETED,
      totalCost,
      totalTokens,
      duration,
      stepsCompleted,
      metadata: {},
    };
  }

  private async executeStep(
    workflow: IAiWorkflow,
    execution: IAiWorkflowExecution,
    step: IWorkflowStep,
    stepIndex: number,
  ): Promise<{ status: string; cost?: number; tokens?: number; output?: unknown }> {
    const stepExecution = await this.repository.createStepExecution({
      executionId: execution.id,
      workspaceId: execution.workspaceId,
      stepId: step.id,
      stepIndex,
      stepType: step.type,
      input: step.config,
      status: 'running',
      startTime: new Date(),
      attemptNumber: 1,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.EXECUTION_STEP_STARTED,
      workspaceId: execution.workspaceId,
      executionId: execution.id,
      stepId: step.id,
    });

    try {
      let output: unknown;
      let cost = 0;
      let tokens = 0;

      switch (step.type) {
        case AiWorkflowStepType.AGENT:
          const agentResult = await this.agentService.executeAgent({
            workspaceId: execution.workspaceId,
            agentId: (step.config as any).agentId,
            input: (step.config as any).input || '',
            context: execution.context as any,
          });
          output = agentResult.output;
          cost = agentResult.totalCost;
          tokens = agentResult.totalTokens;
          break;

        case AiWorkflowStepType.ORCHESTRATOR:
          const orchResult = await this.orchestratorService.executeRequest({
            workspaceId: execution.workspaceId,
            useCase: (step.config as any).useCase || 'workflow-step',
            capability: (step.config as any).capability,
            prompt: (step.config as any).prompt,
            context: execution.context as any,
            requestMetadata: {
              workflowId: execution.workflowId,
              workflowExecutionId: execution.id,
            },
          });
          output = orchResult.content;
          cost = orchResult.cost;
          tokens = orchResult.totalTokens;
          break;

        case AiWorkflowStepType.CONDITION:
          output = this.evaluateCondition(step.condition!, execution.context);
          break;

        case AiWorkflowStepType.WAIT:
          await this.delay((step.config as any).duration || 1000);
          output = { waited: true };
          break;

        default:
          output = { executed: true };
      }

      await this.repository.updateStepExecution(stepExecution.id, {
        status: 'completed',
        endTime: new Date(),
        output,
        cost,
        tokens,
      });

      await this.eventQueue.publish({
        event: AiWorkflowEvent.EXECUTION_STEP_COMPLETED,
        workspaceId: execution.workspaceId,
        executionId: execution.id,
        stepId: step.id,
        status: 'completed',
      });

      return { status: 'completed', cost, tokens, output };
    } catch (error) {
      await this.repository.updateStepExecution(stepExecution.id, {
        status: 'failed',
        endTime: new Date(),
        errorCode: (error as any).code || 'STEP_ERROR',
        errorMessage: (error as Error).message,
      });

      await this.eventQueue.publish({
        event: AiWorkflowEvent.EXECUTION_STEP_FAILED,
        workspaceId: execution.workspaceId,
        executionId: execution.id,
        stepId: step.id,
        status: 'failed',
      });

      return { status: 'failed' };
    }
  }

  private evaluateCondition(condition: string, context: unknown): boolean {
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cancelExecution(id: string, workspaceId: string): Promise<IAiWorkflowExecution> {
    const execution = await this.repository.findExecutionById(id);

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (
      execution.status === AiWorkflowExecutionStatus.COMPLETED ||
      execution.status === AiWorkflowExecutionStatus.FAILED ||
      execution.status === AiWorkflowExecutionStatus.CANCELLED
    ) {
      throw new BusinessRuleException(
        'Cannot cancel execution in current status',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const cancelled = await this.repository.updateExecution(id, {
      status: AiWorkflowExecutionStatus.CANCELLED,
      endTime: new Date(),
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.EXECUTION_CANCELLED,
      workspaceId,
      executionId: id,
    });

    return cancelled as IAiWorkflowExecution;
  }

  async pauseExecution(id: string, workspaceId: string): Promise<IAiWorkflowExecution> {
    const execution = await this.repository.findExecutionById(id);

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const paused = await this.repository.updateExecution(id, {
      status: AiWorkflowExecutionStatus.PAUSED,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.EXECUTION_PAUSED,
      workspaceId,
      executionId: id,
    });

    return paused as IAiWorkflowExecution;
  }

  async resumeExecution(id: string, workspaceId: string): Promise<IAiWorkflowExecution> {
    const execution = await this.repository.findExecutionById(id);

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const resumed = await this.repository.updateExecution(id, {
      status: AiWorkflowExecutionStatus.RUNNING,
    });

    await this.eventQueue.publish({
      event: AiWorkflowEvent.EXECUTION_RESUMED,
      workspaceId,
      executionId: id,
    });

    return resumed as IAiWorkflowExecution;
  }

  async findExecutionById(
    id: string,
    workspaceId: string,
  ): Promise<IAiWorkflowExecution> {
    const execution = await this.repository.findExecutionById(id);

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return execution;
  }

  async findAllExecutions(
    filter: ExecutionFilterDto,
  ): Promise<PaginatedExecutionResponseDto> {
    const [data, total] = await this.repository.findAllExecutions(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as WorkflowExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createSchedule(dto: CreateWorkflowScheduleDto): Promise<IAiWorkflowSchedule> {
    await this.findWorkflowById(dto.workflowId, dto.workspaceId);

    const data = {
      workspaceId: dto.workspaceId,
      workflowId: dto.workflowId,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone || 'UTC',
      enabled: dto.enabled ?? true,
      lastExecutionAt: null,
      nextExecutionAt: null,
      input: dto.input || null,
      metadata: dto.metadata || {},
    };

    return (await this.repository.createSchedule(data)) as IAiWorkflowSchedule;
  }

  async updateSchedule(
    id: string,
    workspaceId: string,
    dto: UpdateWorkflowScheduleDto,
  ): Promise<IAiWorkflowSchedule> {
    await this.findScheduleById(id, workspaceId);

    return (await this.repository.updateSchedule(id, dto)) as IAiWorkflowSchedule;
  }

  async deleteSchedule(id: string, workspaceId: string): Promise<void> {
    await this.findScheduleById(id, workspaceId);
    await this.repository.deleteSchedule(id);
  }

  async findScheduleById(
    id: string,
    workspaceId: string,
  ): Promise<IAiWorkflowSchedule> {
    const schedule = await this.repository.findScheduleById(id, workspaceId);
    if (!schedule) {
      throw new ResourceNotFoundException(
        'Schedule not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return schedule;
  }

  async getWorkflowStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getWorkflowStats(workspaceId, startDate, endDate);
  }
}
