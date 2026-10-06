import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { evaluateConditionGroup } from '@modules/business-rules-engine/condition-evaluator.util';
import { EnterpriseWorkflowEngineRepository } from './enterprise-workflow-engine.repository';
import { EnterpriseWorkflowEngineValidator } from './validator/enterprise-workflow-engine.validator';
import { EnterpriseWorkflowEngineAudit } from './audit/enterprise-workflow-engine.audit';
import { EnterpriseWorkflowEngineEventQueue } from './jobs';
import { WorkflowStepExecutorRegistry } from './registry/workflow-step-executor.registry';
import {
  AiWorkflowStepExecutor,
  ApprovalStepExecutor,
  ConditionStepExecutor,
  NotificationStepExecutor,
  RuleEvaluationStepExecutor,
  TaskStepExecutor,
  TimerStepExecutor,
} from './executors';
import {
  IStepExecutionContext,
  IStepExecutionResult,
  IWorkflowDefinition,
  IWorkflowDefinitionFilterOptions,
  IWorkflowExecution,
  IWorkflowExecutionFilterOptions,
  IWorkflowStageDefinition,
  IWorkflowStepDefinition,
  WorkflowDefinitionStatus,
  WorkflowEngineEvent,
  WorkflowExecutionStatus,
  WorkflowKind,
  WorkflowStepStatus,
  WorkflowStepType,
  WorkflowTriggerType,
} from './interfaces';
import { WORKFLOW_ENGINE_CONSTANTS, WORKFLOW_ENGINE_MODULE, SYSTEM_ACTOR_ID } from './constants';
import {
  WorkflowDefinitionAlreadyExistsException,
  WorkflowDefinitionInvalidException,
  WorkflowDefinitionInvalidStateTransitionException,
  WorkflowDefinitionNotFoundException,
  WorkflowDefinitionNotPublishedException,
  WorkflowExecutionInvalidStateTransitionException,
  WorkflowExecutionNotFoundException,
  WorkflowStepExecutorNotRegisteredException,
  WorkflowStepExecutionNotFoundException,
  WorkflowStepNotWaitingException,
} from './exceptions/enterprise-workflow-engine.exceptions';
import {
  CreateWorkflowDefinitionDto,
  ExecuteWorkflowDto,
  PaginatedWorkflowDefinitionResponseDto,
  PaginatedWorkflowExecutionResponseDto,
  ReassignStepDto,
  ResumeStepExecutionDto,
  UpdateWorkflowDefinitionDto,
  WorkflowDefinitionFilterDto,
  WorkflowDefinitionHistoryResponseDto,
  WorkflowDefinitionResponseDto,
  WorkflowExecutionFilterDto,
  WorkflowExecutionResponseDto,
} from './dto';

interface IStepLocation {
  stageIndex: number;
  stepIndex: number;
}

interface IResumePoint {
  stageIndex: number;
  stepIndex: number;
}

@Injectable()
export class EnterpriseWorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(EnterpriseWorkflowEngineService.name);

  constructor(
    private readonly repository: EnterpriseWorkflowEngineRepository,
    private readonly validator: EnterpriseWorkflowEngineValidator,
    private readonly audit: EnterpriseWorkflowEngineAudit,
    private readonly eventQueue: EnterpriseWorkflowEngineEventQueue,
    private readonly stepExecutorRegistry: WorkflowStepExecutorRegistry,
    private readonly auditLogsService: AuditLogsService,
    private readonly taskStepExecutor: TaskStepExecutor,
    private readonly approvalStepExecutor: ApprovalStepExecutor,
    private readonly notificationStepExecutor: NotificationStepExecutor,
    private readonly ruleEvaluationStepExecutor: RuleEvaluationStepExecutor,
    private readonly aiWorkflowStepExecutor: AiWorkflowStepExecutor,
    private readonly conditionStepExecutor: ConditionStepExecutor,
    private readonly timerStepExecutor: TimerStepExecutor,
  ) {}

  onModuleInit(): void {
    this.stepExecutorRegistry.register(this.taskStepExecutor);
    this.stepExecutorRegistry.register(this.approvalStepExecutor);
    this.stepExecutorRegistry.register(this.notificationStepExecutor);
    this.stepExecutorRegistry.register(this.ruleEvaluationStepExecutor);
    this.stepExecutorRegistry.register(this.aiWorkflowStepExecutor);
    this.stepExecutorRegistry.register(this.conditionStepExecutor);
    this.stepExecutorRegistry.register(this.timerStepExecutor);
  }

  // ── Definitions: create/update/version ─────────────────────────

  async createDefinition(
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: CreateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.CREATE);

    const effectiveWorkspaceId = dto.isGlobal ? null : workspaceId;
    const existing = await this.repository.findLatestByKey(dto.key, effectiveWorkspaceId);
    if (existing) {
      throw new WorkflowDefinitionAlreadyExistsException(dto.key);
    }

    const structure = this.validator.validateStructure(dto.stages);
    const businessWarnings = await this.validator.validateBusinessRef(dto.businessId, workspaceId);
    if (!structure.valid) {
      throw new WorkflowDefinitionInvalidException(structure.errors);
    }

    const raw = await this.repository.createDefinition({
      workspaceId: effectiveWorkspaceId,
      organizationId: dto.organizationId ?? null,
      businessId: dto.businessId ?? null,
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      version: 1,
      status: WorkflowDefinitionStatus.DRAFT,
      workflowKind: dto.workflowKind ?? WorkflowKind.SEQUENTIAL,
      triggerType: dto.triggerType ?? WorkflowTriggerType.MANUAL,
      triggerConfig: dto.triggerConfig ?? {},
      stages: dto.stages,
      variables: dto.variables ?? {},
      slaMs: dto.slaMs ?? null,
      escalationConfig: dto.escalationConfig ?? null,
      maxRetries: dto.maxRetries ?? WORKFLOW_ENGINE_CONSTANTS.DEFAULT_MAX_RETRIES,
      timeoutMs: dto.timeoutMs ?? null,
      isTemplate: dto.isTemplate ?? false,
      templateKey: dto.templateKey ?? null,
      tags: dto.tags ?? [],
      metadata: { ...(dto.metadata ?? {}), ...(structure.warnings.length || businessWarnings.length ? { warnings: [...structure.warnings, ...businessWarnings] } : {}) },
      createdBy: userId,
      updatedBy: userId,
    });

    const definition = raw as unknown as IWorkflowDefinition;
    await this.audit.logDefinitionChange(definition, 'Created', userId);
    await this.publishEvent(WorkflowEngineEvent.DEFINITION_CREATED, { definitionId: definition.id, workspaceId: workspaceId, performedBy: userId });
    await this.recordCentralAudit('workflow_definition.created', workspaceId, userId, { key: definition.key });

    return WorkflowDefinitionResponseDto.from(raw);
  }

  async updateDefinition(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: UpdateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.UPDATE);
    const existing = (await this.requireDefinition(id, workspaceId)) as unknown as IWorkflowDefinition;

    const stages = (dto.stages as IWorkflowStageDefinition[] | undefined) ?? existing.stages;
    const structure = this.validator.validateStructure(stages);
    if (!structure.valid) {
      throw new WorkflowDefinitionInvalidException(structure.errors);
    }

    const patch: Record<string, unknown> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.workflowKind !== undefined && { workflowKind: dto.workflowKind }),
      ...(dto.triggerType !== undefined && { triggerType: dto.triggerType }),
      ...(dto.triggerConfig !== undefined && { triggerConfig: dto.triggerConfig }),
      ...(dto.stages !== undefined && { stages: dto.stages }),
      ...(dto.variables !== undefined && { variables: dto.variables }),
      ...(dto.slaMs !== undefined && { slaMs: dto.slaMs }),
      ...(dto.escalationConfig !== undefined && { escalationConfig: dto.escalationConfig }),
      ...(dto.maxRetries !== undefined && { maxRetries: dto.maxRetries }),
      ...(dto.timeoutMs !== undefined && { timeoutMs: dto.timeoutMs }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updatedBy: userId,
    };

    let raw: Record<string, unknown>;
    if (WORKFLOW_ENGINE_CONSTANTS.MUTABLE_DEFINITION_STATUSES.has(existing.status)) {
      raw = await this.repository.updateDefinition(id, patch);
    } else {
      // Published/paused/deprecated — create a new DRAFT version instead of mutating the live definition.
      raw = await this.repository.createDefinition({
        workspaceId: existing.workspaceId,
        organizationId: existing.organizationId,
        businessId: existing.businessId,
        key: existing.key,
        name: patch['name'] ?? existing.name,
        description: patch['description'] ?? existing.description,
        version: existing.version + 1,
        status: WorkflowDefinitionStatus.DRAFT,
        workflowKind: patch['workflowKind'] ?? existing.workflowKind,
        triggerType: patch['triggerType'] ?? existing.triggerType,
        triggerConfig: patch['triggerConfig'] ?? existing.triggerConfig,
        stages: patch['stages'] ?? existing.stages,
        variables: patch['variables'] ?? existing.variables,
        slaMs: patch['slaMs'] ?? existing.slaMs,
        escalationConfig: patch['escalationConfig'] ?? existing.escalationConfig,
        maxRetries: patch['maxRetries'] ?? existing.maxRetries,
        timeoutMs: patch['timeoutMs'] ?? existing.timeoutMs,
        isTemplate: existing.isTemplate,
        templateKey: existing.templateKey,
        supersedesId: existing.id,
        tags: patch['tags'] ?? existing.tags,
        metadata: patch['metadata'] ?? existing.metadata,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    const definition = raw as unknown as IWorkflowDefinition;
    await this.audit.logDefinitionChange(definition, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(WorkflowEngineEvent.DEFINITION_UPDATED, { definitionId: definition.id, workspaceId, performedBy: userId });

    return WorkflowDefinitionResponseDto.from(raw);
  }

  // ── Definitions: lifecycle ──────────────────────────────────────

  async publishDefinition(id: string, workspaceId: string, userId: string, userRole: string): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.PUBLISH);
    const existing = (await this.requireDefinition(id, workspaceId)) as unknown as IWorkflowDefinition;
    this.assertTransition(existing.status, WorkflowDefinitionStatus.PUBLISHED);

    const unresolved = this.validator.assertPublishable(existing.stages);
    if (unresolved.length > 0) {
      throw new WorkflowDefinitionInvalidException(unresolved);
    }

    const raw = await this.repository.updateDefinition(id, {
      status: WorkflowDefinitionStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedBy: userId,
      updatedBy: userId,
    });
    return this.transitionSideEffects(raw, WorkflowEngineEvent.DEFINITION_PUBLISHED, 'Published', userId, workspaceId);
  }

  async pauseDefinition(id: string, workspaceId: string, userId: string, userRole: string): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.UPDATE);
    const existing = (await this.requireDefinition(id, workspaceId)) as unknown as IWorkflowDefinition;
    this.assertTransition(existing.status, WorkflowDefinitionStatus.PAUSED);
    const raw = await this.repository.updateDefinition(id, { status: WorkflowDefinitionStatus.PAUSED, updatedBy: userId });
    return this.transitionSideEffects(raw, WorkflowEngineEvent.DEFINITION_PAUSED, 'Paused', userId, workspaceId);
  }

  async resumeDefinition(id: string, workspaceId: string, userId: string, userRole: string): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.UPDATE);
    const existing = (await this.requireDefinition(id, workspaceId)) as unknown as IWorkflowDefinition;
    this.assertTransition(existing.status, WorkflowDefinitionStatus.PUBLISHED);
    const raw = await this.repository.updateDefinition(id, { status: WorkflowDefinitionStatus.PUBLISHED, updatedBy: userId });
    return this.transitionSideEffects(raw, WorkflowEngineEvent.DEFINITION_RESUMED, 'Resumed', userId, workspaceId);
  }

  async archiveDefinition(id: string, workspaceId: string, userId: string, userRole: string): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.DELETE);
    const existing = (await this.requireDefinition(id, workspaceId)) as unknown as IWorkflowDefinition;
    this.assertTransition(existing.status, WorkflowDefinitionStatus.ARCHIVED);
    const raw = await this.repository.updateDefinition(id, { status: WorkflowDefinitionStatus.ARCHIVED, updatedBy: userId });
    return this.transitionSideEffects(raw, WorkflowEngineEvent.DEFINITION_ARCHIVED, 'Archived', userId, workspaceId);
  }

  async restoreDefinition(id: string, workspaceId: string, userId: string, userRole: string): Promise<WorkflowDefinitionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'workflow_definition', PermissionAction.UPDATE);
    const existing = (await this.requireDefinition(id, workspaceId)) as unknown as IWorkflowDefinition;
    this.assertTransition(existing.status, WorkflowDefinitionStatus.DRAFT);
    const raw = await this.repository.updateDefinition(id, { status: WorkflowDefinitionStatus.DRAFT, updatedBy: userId });
    return this.transitionSideEffects(raw, WorkflowEngineEvent.DEFINITION_RESTORED, 'Restored', userId, workspaceId);
  }

  // ── Definitions: read ────────────────────────────────────────────

  async findDefinitionById(id: string, workspaceId?: string): Promise<WorkflowDefinitionResponseDto> {
    return WorkflowDefinitionResponseDto.from(await this.requireDefinition(id, workspaceId));
  }

  async findDefinitions(workspaceId: string, filter: WorkflowDefinitionFilterDto): Promise<PaginatedWorkflowDefinitionResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? WORKFLOW_ENGINE_CONSTANTS.DEFAULT_PAGE_SIZE, WORKFLOW_ENGINE_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findDefinitions(workspaceId, filter as IWorkflowDefinitionFilterOptions);
    return PaginatedWorkflowDefinitionResponseDto.from(items, total, page, limit);
  }

  async getDefinitionHistory(id: string, workspaceId?: string): Promise<WorkflowDefinitionHistoryResponseDto[]> {
    await this.requireDefinition(id, workspaceId);
    const raws = await this.repository.findDefinitionHistory(id);
    return raws.map((r) => WorkflowDefinitionHistoryResponseDto.from(r as any));
  }

  // ── Execution: start ──────────────────────────────────────────────

  async executeWorkflow(workspaceId: string, userId: string | undefined, dto: ExecuteWorkflowDto): Promise<WorkflowExecutionResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findExecutionByIdempotencyKey(workspaceId, dto.definitionId, dto.idempotencyKey);
      if (existing) {
        return WorkflowExecutionResponseDto.from(existing);
      }
    }

    const definition = (await this.requireDefinition(dto.definitionId, workspaceId)) as unknown as IWorkflowDefinition;
    if (definition.status !== WorkflowDefinitionStatus.PUBLISHED) {
      throw new WorkflowDefinitionNotPublishedException(definition.key);
    }

    const raw = await this.repository.createExecution({
      workspaceId,
      organizationId: definition.organizationId,
      businessId: definition.businessId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      status: WorkflowExecutionStatus.PENDING,
      triggerType: dto.triggerType ?? WorkflowTriggerType.MANUAL,
      triggeredBy: dto.triggeredBy ?? userId ?? SYSTEM_ACTOR_ID,
      idempotencyKey: dto.idempotencyKey ?? null,
      input: dto.input ?? null,
      variables: { ...definition.variables, ...(dto.input ?? {}) },
      context: {},
      attemptNumber: 1,
      compensationExecuted: false,
      metadata: dto.metadata ?? {},
    });

    let execution = raw as unknown as IWorkflowExecution;
    await this.publishEvent(WorkflowEngineEvent.EXECUTION_STARTED, { definitionId: definition.id, executionId: execution.id, workspaceId });

    execution = await this.processExecution(definition, execution, userId);
    return WorkflowExecutionResponseDto.from(await this.repository.findExecutionById(execution.id) as Record<string, unknown>);
  }

  // ── Execution engine ────────────────────────────────────────────

  private async processExecution(
    definition: IWorkflowDefinition,
    execution: IWorkflowExecution,
    userId: string | undefined,
    resumeFrom?: IResumePoint,
  ): Promise<IWorkflowExecution> {
    await this.repository.updateExecution(execution.id, { status: WorkflowExecutionStatus.RUNNING });
    execution = { ...execution, status: WorkflowExecutionStatus.RUNNING };

    const stages = definition.stages;
    const startStageIndex = resumeFrom?.stageIndex ?? 0;

    for (let si = startStageIndex; si < stages.length; si++) {
      const stage = stages[si];
      const startStepIndex = si === startStageIndex ? resumeFrom?.stepIndex ?? 0 : 0;

      if (stage.parallel) {
        const results = await Promise.all(
          stage.steps.slice(startStepIndex).map((step, offset) => this.runStepWithConditionAndRetries(definition, execution, stage, step, startStepIndex + offset, userId)),
        );
        for (const { step, result } of results) {
          const { outcome, execution: updated } = await this.applyStepOutcome(definition, execution, stages, si, stage, step, result, userId);
          if (outcome !== 'continue') return this.reload(execution.id);
          execution = updated ?? (await this.reload(execution.id));
        }
        continue;
      }

      for (let sti = startStepIndex; sti < stage.steps.length; sti++) {
        const step = stage.steps[sti];
        const result = await this.runStepWithConditionAndRetries(definition, execution, stage, step, sti, userId).then((r) => r.result);
        const { outcome, execution: updated } = await this.applyStepOutcome(definition, execution, stages, si, stage, step, result, userId);
        if (outcome !== 'continue') return this.reload(execution.id);
        execution = updated ?? (await this.reload(execution.id));
      }
    }

    await this.repository.updateExecution(execution.id, {
      status: WorkflowExecutionStatus.COMPLETED,
      endTime: new Date(),
      output: execution.variables,
    });
    await this.publishEvent(WorkflowEngineEvent.EXECUTION_COMPLETED, { definitionId: definition.id, executionId: execution.id, workspaceId: execution.workspaceId });
    return this.reload(execution.id);
  }

  private async reload(executionId: string): Promise<IWorkflowExecution> {
    return (await this.repository.findExecutionById(executionId)) as unknown as IWorkflowExecution;
  }

  private async runStepWithConditionAndRetries(
    definition: IWorkflowDefinition,
    execution: IWorkflowExecution,
    stage: IWorkflowStageDefinition,
    step: IWorkflowStepDefinition,
    stepIndex: number,
    userId: string | undefined,
  ): Promise<{ step: IWorkflowStepDefinition; result: IStepExecutionResult }> {
    if (step.condition && !evaluateConditionGroup(step.condition, execution.variables)) {
      await this.repository.createStepExecution({
        executionId: execution.id,
        workspaceId: execution.workspaceId,
        stageId: stage.id,
        stepId: step.id,
        stepIndex,
        stepType: step.type,
        status: WorkflowStepStatus.SKIPPED,
        input: step.config,
        startTime: new Date(),
        endTime: new Date(),
        attemptNumber: 1,
        metadata: {},
      });
      return { step, result: { status: WorkflowStepStatus.SKIPPED } };
    }

    const maxAttempts = (step.retries ?? 0) + 1;
    let lastResult: IStepExecutionResult = { status: WorkflowStepStatus.FAILED, errorMessage: 'Step did not execute' };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const stepExecution = await this.repository.createStepExecution({
        executionId: execution.id,
        workspaceId: execution.workspaceId,
        stageId: stage.id,
        stepId: step.id,
        stepIndex,
        stepType: step.type,
        status: WorkflowStepStatus.RUNNING,
        input: step.config,
        startTime: new Date(),
        attemptNumber: attempt,
        assignedTo: step.assigneeRef ?? null,
        metadata: {},
      });
      await this.publishEvent(WorkflowEngineEvent.EXECUTION_STEP_STARTED, {
        definitionId: definition.id,
        executionId: execution.id,
        stepExecutionId: stepExecution['id'] as string,
        stepId: step.id,
        workspaceId: execution.workspaceId,
      });

      try {
        lastResult = await this.dispatchStep(definition, execution, stage.id, step, stepIndex, userId);
      } catch (err) {
        lastResult = { status: WorkflowStepStatus.FAILED, errorCode: 'STEP_ERROR', errorMessage: (err as Error).message };
      }

      if (lastResult.status === WorkflowStepStatus.WAITING) {
        const dueAt = step.slaMs
          ? new Date(Date.now() + step.slaMs)
          : lastResult.output?.['dueAt']
            ? new Date(lastResult.output['dueAt'] as string)
            : null;
        await this.repository.updateStepExecution(stepExecution['id'] as string, {
          status: WorkflowStepStatus.WAITING,
          output: lastResult.output ?? null,
          dueAt,
          externalRef: lastResult.externalRef ?? null,
        });
        await this.publishEvent(WorkflowEngineEvent.EXECUTION_STEP_WAITING, {
          definitionId: definition.id,
          executionId: execution.id,
          stepExecutionId: stepExecution['id'] as string,
          stepId: step.id,
          workspaceId: execution.workspaceId,
        });
        return { step, result: lastResult };
      }

      if (lastResult.status !== WorkflowStepStatus.FAILED) {
        await this.repository.updateStepExecution(stepExecution['id'] as string, {
          status: lastResult.status,
          endTime: new Date(),
          output: lastResult.output ?? null,
        });
        await this.publishEvent(WorkflowEngineEvent.EXECUTION_STEP_COMPLETED, {
          definitionId: definition.id,
          executionId: execution.id,
          stepExecutionId: stepExecution['id'] as string,
          stepId: step.id,
          workspaceId: execution.workspaceId,
        });
        return { step, result: lastResult };
      }

      await this.repository.updateStepExecution(stepExecution['id'] as string, {
        status: WorkflowStepStatus.FAILED,
        endTime: new Date(),
        errorCode: lastResult.errorCode ?? 'STEP_FAILED',
        errorMessage: lastResult.errorMessage ?? null,
      });
      await this.publishEvent(WorkflowEngineEvent.EXECUTION_STEP_FAILED, {
        definitionId: definition.id,
        executionId: execution.id,
        stepExecutionId: stepExecution['id'] as string,
        stepId: step.id,
        workspaceId: execution.workspaceId,
        metadata: { attempt, maxAttempts },
      });
    }

    return { step, result: lastResult };
  }

  /** Applies a completed/failed/waiting step result: merges output, writes a checkpoint, follows branch/compensation, or pauses the execution. Returns how the caller should continue. */
  /**
   * Returns the freshly-updated execution row alongside the outcome for
   * the 'continue' case — `updateExecution` (Prisma `.update()`) already
   * returns the full updated row, so the hot per-step loop in
   * `processExecution` can advance without a separate `reload()` (which
   * joins in every step-execution row and would otherwise re-fetch a
   * growing result set on every single step). 'paused'/'stopped'/
   * 'jumped' are unaffected — those already terminate or hand off to a
   * single reload/recursive call, not a per-step one.
   */
  private async applyStepOutcome(
    definition: IWorkflowDefinition,
    execution: IWorkflowExecution,
    stages: IWorkflowStageDefinition[],
    stageIndex: number,
    stage: IWorkflowStageDefinition,
    step: IWorkflowStepDefinition,
    result: IStepExecutionResult,
    userId: string | undefined,
  ): Promise<{ outcome: 'continue' | 'paused' | 'jumped' | 'stopped'; execution?: IWorkflowExecution }> {
    if (result.status === WorkflowStepStatus.WAITING) {
      await this.repository.updateExecution(execution.id, {
        status: WorkflowExecutionStatus.WAITING,
        currentStageIndex: stageIndex,
        currentStepId: step.id,
      });
      return { outcome: 'paused' };
    }

    if (result.status === WorkflowStepStatus.SKIPPED) {
      return { outcome: 'continue', execution };
    }

    const variables = { ...execution.variables, [step.id]: result.output ?? {} };
    const updatedExecution = (await this.repository.updateExecution(execution.id, { variables })) as unknown as IWorkflowExecution;
    await this.writeCheckpoint(execution, step.id, variables);

    if (result.status === WorkflowStepStatus.FAILED) {
      if (step.compensation) {
        await this.runCompensation(definition, execution, stage, step, userId);
      }
      if (step.onFailure && step.onFailure.length > 0) {
        const target = this.locateStep(stages, step.onFailure[0]);
        if (target) {
          await this.processExecution(definition, { ...execution, variables }, userId, target);
          return { outcome: 'jumped' };
        }
      }
      await this.repository.updateExecution(execution.id, {
        status: WorkflowExecutionStatus.FAILED,
        endTime: new Date(),
        errorCode: result.errorCode ?? 'STEP_FAILED',
        errorMessage: result.errorMessage ?? `Step '${step.id}' failed`,
      });
      await this.publishEvent(WorkflowEngineEvent.EXECUTION_FAILED, {
        definitionId: definition.id,
        executionId: execution.id,
        stepId: step.id,
        workspaceId: execution.workspaceId,
      });
      return { outcome: 'stopped' };
    }

    if (step.onSuccess && step.onSuccess.length > 0) {
      const target = this.locateStep(stages, step.onSuccess[0]);
      if (target) {
        await this.processExecution(definition, { ...execution, variables }, userId, target);
        return { outcome: 'jumped' };
      }
    }

    return { outcome: 'continue', execution: updatedExecution };
  }

  private locateStep(stages: IWorkflowStageDefinition[], stepId: string): IStepLocation | null {
    for (let si = 0; si < stages.length; si++) {
      const sti = stages[si].steps.findIndex((s) => s.id === stepId);
      if (sti >= 0) return { stageIndex: si, stepIndex: sti };
    }
    return null;
  }

  private async writeCheckpoint(execution: IWorkflowExecution, stepId: string, variables: Record<string, unknown>): Promise<void> {
    try {
      const latest = await this.repository.findLatestCheckpoint(execution.id);
      const sequence = latest ? ((latest['sequence'] as number) + 1) : 1;
      await this.repository.createCheckpoint({
        executionId: execution.id,
        workspaceId: execution.workspaceId,
        stepId,
        sequence,
        variables,
        context: execution.context,
      });
    } catch (err) {
      this.logger.warn(`Checkpoint write failed for execution '${execution.id}': ${(err as Error).message}`);
    }
  }

  private async runCompensation(
    definition: IWorkflowDefinition,
    execution: IWorkflowExecution,
    stage: IWorkflowStageDefinition,
    step: IWorkflowStepDefinition,
    userId: string | undefined,
  ): Promise<void> {
    if (!step.compensation) return;
    try {
      await this.dispatchStep(definition, execution, stage.id, step.compensation, -1, userId);
      await this.repository.updateExecution(execution.id, { compensationExecuted: true });
      await this.publishEvent(WorkflowEngineEvent.EXECUTION_COMPENSATED, {
        definitionId: definition.id,
        executionId: execution.id,
        stepId: step.id,
        workspaceId: execution.workspaceId,
      });
    } catch (err) {
      this.logger.warn(`Compensation failed for step '${step.id}' on execution '${execution.id}': ${(err as Error).message}`);
    }
  }

  private async dispatchStep(
    definition: IWorkflowDefinition,
    execution: IWorkflowExecution,
    stageId: string,
    step: IWorkflowStepDefinition,
    stepIndex: number,
    userId: string | undefined,
  ): Promise<IStepExecutionResult> {
    if (step.type === WorkflowStepType.PARALLEL) {
      const nested = (step.config['parallelSteps'] as IWorkflowStepDefinition[] | undefined) ?? [];
      const outputs = await Promise.all(nested.map((s) => this.dispatchStep(definition, execution, stageId, s, -1, userId)));
      const failed = outputs.find((o) => o.status === WorkflowStepStatus.FAILED);
      if (failed) return failed;
      const waiting = outputs.find((o) => o.status === WorkflowStepStatus.WAITING);
      if (waiting) return waiting;
      return { status: WorkflowStepStatus.COMPLETED, output: { results: outputs.map((o) => o.output ?? {}) } };
    }

    if (step.type === WorkflowStepType.LOOP) {
      const items = ((step.config['items'] as unknown[] | undefined) ?? []).slice(0, WORKFLOW_ENGINE_CONSTANTS.MAX_LOOP_ITERATIONS);
      const itemVar = (step.config['itemVar'] as string) ?? 'item';
      const bodyStep = step.config['step'] as IWorkflowStepDefinition | undefined;
      if (!bodyStep) return { status: WorkflowStepStatus.COMPLETED, output: { iterations: 0 } };

      const results: unknown[] = [];
      for (const item of items) {
        execution = { ...execution, variables: { ...execution.variables, [itemVar]: item } };
        const iterationResult = await this.dispatchStep(definition, execution, stageId, bodyStep, -1, userId);
        if (iterationResult.status !== WorkflowStepStatus.COMPLETED) return iterationResult;
        results.push(iterationResult.output ?? {});
      }
      return { status: WorkflowStepStatus.COMPLETED, output: { results } };
    }

    if (step.type === WorkflowStepType.SUB_WORKFLOW) {
      const subDefinitionId = step.config['definitionId'] as string;
      const subInput = { ...execution.variables, ...(step.config['input'] as Record<string, unknown> | undefined) };
      const subExecution = await this.executeWorkflow(execution.workspaceId, userId, {
        definitionId: subDefinitionId,
        input: subInput,
        triggerType: WorkflowTriggerType.API,
        triggeredBy: userId,
      });
      if (subExecution.status === WorkflowExecutionStatus.COMPLETED) {
        return { status: WorkflowStepStatus.COMPLETED, output: subExecution.output ?? {} };
      }
      return {
        status: WorkflowStepStatus.FAILED,
        errorCode: 'SUB_WORKFLOW_INCOMPLETE',
        errorMessage: `Sub-workflow execution '${subExecution.id}' did not complete synchronously (status: ${subExecution.status})`,
      };
    }

    const executor = this.stepExecutorRegistry.get(step.type);
    if (!executor) {
      throw new WorkflowStepExecutorNotRegisteredException(step.type);
    }

    const ctx: IStepExecutionContext = {
      definition,
      execution,
      step,
      stageId,
      stepIndex,
      workspaceId: execution.workspaceId,
      businessId: execution.businessId,
      userId,
    };
    return executor.execute(ctx);
  }

  // ── Execution: manual intervention ───────────────────────────────

  async resumeStepExecution(
    executionId: string,
    workspaceId: string,
    stepExecutionId: string,
    dto: ResumeStepExecutionDto,
    userId?: string,
  ): Promise<WorkflowExecutionResponseDto> {
    const execution = (await this.requireExecution(executionId, workspaceId)) as unknown as IWorkflowExecution;
    const stepExecution = await this.repository.findStepExecutionById(stepExecutionId);
    if (!stepExecution || stepExecution['executionId'] !== executionId) {
      throw new WorkflowStepExecutionNotFoundException(stepExecutionId);
    }
    if (stepExecution['status'] !== WorkflowStepStatus.WAITING) {
      throw new WorkflowStepNotWaitingException(stepExecutionId, stepExecution['status'] as string);
    }

    await this.repository.updateStepExecution(stepExecutionId, {
      status: dto.status,
      endTime: new Date(),
      output: dto.output ?? null,
      errorMessage: dto.errorMessage ?? null,
    });

    const definition = (await this.requireDefinition(execution.definitionId)) as unknown as IWorkflowDefinition;
    const step = this.findStepDefinitionById(definition.stages, stepExecution['stepId'] as string);
    const location = this.locateStep(definition.stages, stepExecution['stepId'] as string);
    if (!step || !location) {
      throw new WorkflowStepExecutionNotFoundException(stepExecutionId);
    }

    const stage = definition.stages[location.stageIndex];
    const result: IStepExecutionResult = {
      status: dto.status,
      output: dto.output,
      errorMessage: dto.errorMessage,
    };

    await this.publishEvent(WorkflowEngineEvent.EXECUTION_RESUMED, { definitionId: definition.id, executionId, stepId: step.id, workspaceId, performedBy: userId });

    const { outcome } = await this.applyStepOutcome(definition, execution, definition.stages, location.stageIndex, stage, step, result, userId);
    if (outcome === 'continue') {
      const next = this.nextLocation(definition.stages, location);
      if (next) {
        await this.processExecution(definition, await this.reload(executionId), userId, next);
      } else {
        await this.repository.updateExecution(executionId, { status: WorkflowExecutionStatus.COMPLETED, endTime: new Date() });
        await this.publishEvent(WorkflowEngineEvent.EXECUTION_COMPLETED, { definitionId: definition.id, executionId, workspaceId });
      }
    }

    return WorkflowExecutionResponseDto.from((await this.repository.findExecutionById(executionId)) as Record<string, unknown>);
  }

  async reassignStep(executionId: string, workspaceId: string, stepExecutionId: string, dto: ReassignStepDto, userId?: string): Promise<void> {
    await this.requireExecution(executionId, workspaceId);
    const stepExecution = await this.repository.findStepExecutionById(stepExecutionId);
    if (!stepExecution || stepExecution['executionId'] !== executionId) {
      throw new WorkflowStepExecutionNotFoundException(stepExecutionId);
    }
    await this.repository.updateStepExecution(stepExecutionId, { assignedTo: dto.assignedTo });
    await this.recordCentralAudit('workflow_execution.step_reassigned', workspaceId, userId, { executionId, stepExecutionId, assignedTo: dto.assignedTo });
  }

  async pauseExecution(id: string, workspaceId: string, userId?: string): Promise<WorkflowExecutionResponseDto> {
    const existing = (await this.requireExecution(id, workspaceId)) as unknown as IWorkflowExecution;
    this.assertExecutionTransition(existing.status, WorkflowExecutionStatus.PAUSED);
    const raw = await this.repository.updateExecution(id, { status: WorkflowExecutionStatus.PAUSED });
    await this.publishEvent(WorkflowEngineEvent.EXECUTION_PAUSED, { executionId: id, workspaceId, performedBy: userId });
    return WorkflowExecutionResponseDto.from(raw);
  }

  /**
   * Unpauses a PAUSED execution and re-enters the processing loop at its
   * last recorded position. If that position is a step still WAITING on
   * external input (a task/approval), resolve it via
   * `resumeStepExecution` instead — that is the correct path for
   * advancing past a specific human-in-the-loop step; this method is for
   * restarting an execution paused between steps/stages.
   */
  async resumeExecution(id: string, workspaceId: string, userId?: string): Promise<WorkflowExecutionResponseDto> {
    const existing = (await this.requireExecution(id, workspaceId)) as unknown as IWorkflowExecution;
    this.assertExecutionTransition(existing.status, WorkflowExecutionStatus.RUNNING);
    const definition = (await this.requireDefinition(existing.definitionId)) as unknown as IWorkflowDefinition;
    const currentLocation = existing.currentStepId ? this.locateStep(definition.stages, existing.currentStepId) : null;
    const resumeFrom: IResumePoint = currentLocation ?? { stageIndex: existing.currentStageIndex ?? 0, stepIndex: 0 };
    await this.publishEvent(WorkflowEngineEvent.EXECUTION_RESUMED, { executionId: id, workspaceId, performedBy: userId });
    const updated = await this.processExecution(definition, existing, userId, resumeFrom);
    return WorkflowExecutionResponseDto.from(updated as unknown as Record<string, unknown>);
  }

  async cancelExecution(id: string, workspaceId: string, userId?: string, reason?: string): Promise<WorkflowExecutionResponseDto> {
    const existing = (await this.requireExecution(id, workspaceId)) as unknown as IWorkflowExecution;
    this.assertExecutionTransition(existing.status, WorkflowExecutionStatus.CANCELLED);
    const raw = await this.repository.updateExecution(id, {
      status: WorkflowExecutionStatus.CANCELLED,
      endTime: new Date(),
      errorMessage: reason ?? null,
    });
    await this.publishEvent(WorkflowEngineEvent.EXECUTION_CANCELLED, { executionId: id, workspaceId, performedBy: userId });
    return WorkflowExecutionResponseDto.from(raw);
  }

  // ── Execution: read ────────────────────────────────────────────

  async findExecutionById(id: string, workspaceId: string): Promise<WorkflowExecutionResponseDto> {
    return WorkflowExecutionResponseDto.from(await this.requireExecution(id, workspaceId));
  }

  async findExecutions(filter: WorkflowExecutionFilterDto, workspaceId: string): Promise<PaginatedWorkflowExecutionResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? WORKFLOW_ENGINE_CONSTANTS.DEFAULT_PAGE_SIZE, WORKFLOW_ENGINE_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findExecutions({ ...filter, workspaceId } as IWorkflowExecutionFilterOptions);
    return PaginatedWorkflowExecutionResponseDto.from(items, total, page, limit);
  }

  // ── Scheduled polling (invoked periodically, same pattern as processDueScheduledRules/processRemindersAndEscalations) ──

  async processDueTimers(): Promise<{ resumedCount: number }> {
    const due = await this.repository.findOverdueStepExecutions(new Date());
    let resumedCount = 0;
    for (const stepExecution of due) {
      if (stepExecution['stepType'] !== WorkflowStepType.TIMER) continue;
      try {
        await this.resumeStepExecution(
          stepExecution['executionId'] as string,
          stepExecution['workspaceId'] as string,
          stepExecution['id'] as string,
          { status: WorkflowStepStatus.COMPLETED, output: { timedOut: false } },
        );
        resumedCount++;
      } catch (err) {
        this.logger.warn(`Failed to resume due timer step '${stepExecution['id']}': ${(err as Error).message}`);
      }
    }
    return { resumedCount };
  }

  async processEscalations(): Promise<{ escalatedCount: number }> {
    const overdue = await this.repository.findOverdueStepExecutions(new Date());
    let escalatedCount = 0;
    for (const stepExecution of overdue) {
      if (stepExecution['stepType'] === WorkflowStepType.TIMER) continue;
      await this.repository.updateStepExecution(stepExecution['id'] as string, { escalatedAt: new Date() });
      await this.publishEvent(WorkflowEngineEvent.EXECUTION_STEP_ESCALATED, {
        executionId: stepExecution['executionId'] as string,
        stepExecutionId: stepExecution['id'] as string,
        stepId: stepExecution['stepId'] as string,
        workspaceId: stepExecution['workspaceId'] as string,
      });
      escalatedCount++;
    }
    return { escalatedCount };
  }

  // ── Helpers ───────────────────────────────────────────────────

  private findStepDefinitionById(stages: IWorkflowStageDefinition[], stepId: string): IWorkflowStepDefinition | null {
    for (const stage of stages) {
      const step = stage.steps.find((s) => s.id === stepId);
      if (step) return step;
    }
    return null;
  }

  private nextLocation(stages: IWorkflowStageDefinition[], from: IStepLocation): IResumePoint | null {
    const stage = stages[from.stageIndex];
    if (from.stepIndex + 1 < stage.steps.length) {
      return { stageIndex: from.stageIndex, stepIndex: from.stepIndex + 1 };
    }
    if (from.stageIndex + 1 < stages.length) {
      return { stageIndex: from.stageIndex + 1, stepIndex: 0 };
    }
    return null;
  }

  private assertTransition(from: WorkflowDefinitionStatus, to: WorkflowDefinitionStatus): void {
    const allowed = WORKFLOW_ENGINE_CONSTANTS.ALLOWED_DEFINITION_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new WorkflowDefinitionInvalidStateTransitionException(from, to);
    }
  }

  private assertExecutionTransition(from: WorkflowExecutionStatus, to: WorkflowExecutionStatus): void {
    const allowed = WORKFLOW_ENGINE_CONSTANTS.ALLOWED_EXECUTION_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new WorkflowExecutionInvalidStateTransitionException(from, to);
    }
  }

  private async transitionSideEffects(
    raw: Record<string, unknown>,
    event: WorkflowEngineEvent,
    changeReason: string,
    userId: string,
    workspaceId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    const definition = raw as unknown as IWorkflowDefinition;
    await this.audit.logDefinitionChange(definition, changeReason, userId);
    await this.publishEvent(event, { definitionId: definition.id, workspaceId, performedBy: userId });
    await this.recordCentralAudit(`workflow_definition.${changeReason.toLowerCase()}`, workspaceId, userId, { key: definition.key });
    return WorkflowDefinitionResponseDto.from(raw);
  }

  private async requireDefinition(id: string, workspaceId?: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findDefinitionById(id);
    if (!raw) throw new WorkflowDefinitionNotFoundException(id);
    if (workspaceId !== undefined && raw['workspaceId'] !== null && raw['workspaceId'] !== workspaceId) {
      throw new WorkflowDefinitionNotFoundException(id);
    }
    return raw;
  }

  private async requireExecution(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const raw = await this.repository.findExecutionById(id, workspaceId);
    if (!raw) throw new WorkflowExecutionNotFoundException(id);
    return raw;
  }

  private async publishEvent(
    event: WorkflowEngineEvent,
    fields: { definitionId?: string; executionId?: string; stepExecutionId?: string; stepId?: string; workspaceId: string; performedBy?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      workspaceId: fields.workspaceId,
      definitionId: fields.definitionId,
      executionId: fields.executionId,
      stepExecutionId: fields.stepExecutionId,
      stepId: fields.stepId,
      performedBy: fields.performedBy,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: WORKFLOW_ENGINE_MODULE,
        entityType: 'WorkflowDefinition',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
