import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { EnterpriseWorkflowEngineService } from '@modules/enterprise-workflow-engine/enterprise-workflow-engine.service';
import { WorkflowExecutionStatus, WorkflowKind, WorkflowTriggerType } from '@modules/enterprise-workflow-engine/interfaces';
import { WorkflowStepExecutorRegistry } from '@modules/enterprise-workflow-engine/registry/workflow-step-executor.registry';
import { DisasterRecoveryRepository } from './disaster-recovery.repository';
import { DisasterRecoveryValidator } from './validator/disaster-recovery.validator';
import { DisasterRecoveryAudit } from './audit/disaster-recovery.audit';
import { DrRecoveryLockService } from './lock/dr-recovery-lock.service';
import { DisasterRecoveryEventQueue } from './jobs';
import {
  BackupDiscoveryStepExecutor,
  HealthCheckStepExecutor,
  RegionalFailoverStepExecutor,
  RestoreTargetStepExecutor,
  ValidateBackupStepExecutor,
} from './executors';
import {
  DrCheckpointStatus,
  DrEvent,
  DrExecutionStatus,
  DrExecutionTrigger,
  DrPlanStatus,
  DrPolicyStatus,
  DrRecoveryScope,
  IDrPolicy,
  IDrPolicyFilterOptions,
  IDrRecoveryExecution,
  IDrRecoveryPlan,
  IDrExecutionFilterOptions,
  IDrPlanFilterOptions,
} from './interfaces';
import { DISASTER_RECOVERY_CONSTANTS, DISASTER_RECOVERY_MODULE, SYSTEM_ACTOR_ID } from './constants';
import {
  DrExecutionInvalidStateTransitionException,
  DrExecutionNotFoundException,
  DrPlanAlreadyExistsException,
  DrPlanInvalidDefinitionException,
  DrPlanNotFoundException,
  DrPlanNotPublishedException,
  DrPolicyAlreadyExistsException,
  DrPolicyInvalidStateTransitionException,
  DrPolicyNotFoundException,
} from './exceptions/disaster-recovery.exceptions';
import {
  CreateDrPolicyDto,
  CreateDrRecoveryPlanDto,
  DetectDrDisasterDto,
  DrExecutionFilterDto,
  DrPolicyFilterDto,
  DrRecoveryPlanFilterDto,
  PaginatedDrPolicyResponseDto,
  PaginatedDrRecoveryExecutionResponseDto,
  PaginatedDrRecoveryPlanResponseDto,
  DrPolicyHistoryResponseDto,
  DrPolicyResponseDto,
  DrRecoveryExecutionResponseDto,
  DrRecoveryPlanResponseDto,
  TriggerDrRecoveryDto,
  UpdateDrPolicyDto,
  UpdateDrRecoveryPlanDto,
} from './dto';

@Injectable()
export class DisasterRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(DisasterRecoveryService.name);

  constructor(
    private readonly repository: DisasterRecoveryRepository,
    private readonly validator: DisasterRecoveryValidator,
    private readonly audit: DisasterRecoveryAudit,
    private readonly lockService: DrRecoveryLockService,
    private readonly eventQueue: DisasterRecoveryEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly workflowEngineService: EnterpriseWorkflowEngineService,
    private readonly stepExecutorRegistry: WorkflowStepExecutorRegistry,
    private readonly backupDiscoveryExecutor: BackupDiscoveryStepExecutor,
    private readonly validateBackupExecutor: ValidateBackupStepExecutor,
    private readonly restoreTargetExecutor: RestoreTargetStepExecutor,
    private readonly healthCheckExecutor: HealthCheckStepExecutor,
    private readonly regionalFailoverExecutor: RegionalFailoverStepExecutor,
  ) {}

  onModuleInit(): void {
    this.stepExecutorRegistry.register(this.backupDiscoveryExecutor);
    this.stepExecutorRegistry.register(this.validateBackupExecutor);
    this.stepExecutorRegistry.register(this.restoreTargetExecutor);
    this.stepExecutorRegistry.register(this.healthCheckExecutor);
    this.stepExecutorRegistry.register(this.regionalFailoverExecutor);
  }

  // ── Policies ──────────────────────────────────────────────────

  async createPolicy(workspaceId: string, userId: string, userRole: string, dto: CreateDrPolicyDto): Promise<DrPolicyResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_policy', PermissionAction.CREATE);

    const effectiveWorkspaceId = dto.isGlobal ? null : workspaceId;
    const existing = await this.repository.findActivePolicy(effectiveWorkspaceId, dto.criticalService);
    if (existing) {
      throw new DrPolicyAlreadyExistsException(dto.criticalService);
    }

    const policy = await this.repository.createPolicy({
      workspaceId: effectiveWorkspaceId,
      organizationId: dto.organizationId ?? null,
      environment: dto.environment,
      criticalService: dto.criticalService,
      rpoMinutes: dto.rpoMinutes,
      rtoMinutes: dto.rtoMinutes,
      recoveryPriority: dto.recoveryPriority ?? 100,
      coverageTargets: dto.coverageTargets,
      dependencyOrder: dto.dependencyOrder ?? [],
      regionFailoverConfig: dto.regionFailoverConfig ?? null,
      autoTriggerOnDetection: dto.autoTriggerOnDetection ?? false,
      version: 1,
      status: DrPolicyStatus.DRAFT,
      metadata: dto.metadata ?? {},
      createdBy: userId,
      updatedBy: userId,
    });

    await this.audit.logPolicyChange(policy, 'Created', userId);
    await this.publishEvent(DrEvent.POLICY_CREATED, { workspaceId, policyId: policy.id, performedBy: userId });
    await this.recordCentralAudit('disaster_recovery.policy.created', workspaceId, userId, { criticalService: policy.criticalService });
    return DrPolicyResponseDto.from(policy as unknown as Record<string, unknown>);
  }

  async updatePolicy(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateDrPolicyDto): Promise<DrPolicyResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_policy', PermissionAction.UPDATE);
    const existing = await this.requirePolicy(id, workspaceId);

    const raw = await this.repository.updatePolicy(id, {
      ...(dto.rpoMinutes !== undefined && { rpoMinutes: dto.rpoMinutes }),
      ...(dto.rtoMinutes !== undefined && { rtoMinutes: dto.rtoMinutes }),
      ...(dto.recoveryPriority !== undefined && { recoveryPriority: dto.recoveryPriority }),
      ...(dto.coverageTargets !== undefined && { coverageTargets: dto.coverageTargets }),
      ...(dto.dependencyOrder !== undefined && { dependencyOrder: dto.dependencyOrder }),
      ...(dto.regionFailoverConfig !== undefined && { regionFailoverConfig: dto.regionFailoverConfig }),
      ...(dto.autoTriggerOnDetection !== undefined && { autoTriggerOnDetection: dto.autoTriggerOnDetection }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      version: existing.version + 1,
      updatedBy: userId,
    });

    await this.audit.logPolicyChange(raw, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(DrEvent.POLICY_UPDATED, { workspaceId, policyId: id, performedBy: userId });
    return DrPolicyResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async activatePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, DrPolicyStatus.ACTIVE, DrEvent.POLICY_ACTIVATED, 'Activated');
  }

  async pausePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, DrPolicyStatus.PAUSED, DrEvent.POLICY_PAUSED, 'Paused');
  }

  async archivePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, DrPolicyStatus.ARCHIVED, DrEvent.POLICY_ARCHIVED, 'Archived');
  }

  async restorePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, DrPolicyStatus.DRAFT, DrEvent.POLICY_UPDATED, 'Restored');
  }

  private async transitionPolicy(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    to: DrPolicyStatus,
    event: DrEvent,
    reason: string,
  ): Promise<DrPolicyResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_policy', PermissionAction.UPDATE);
    const existing = await this.requirePolicy(id, workspaceId);
    const allowed = DISASTER_RECOVERY_CONSTANTS.ALLOWED_POLICY_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new DrPolicyInvalidStateTransitionException(existing.status, to);
    }
    const raw = await this.repository.updatePolicy(id, { status: to, updatedBy: userId });
    await this.audit.logPolicyChange(raw, reason, userId);
    await this.publishEvent(event, { workspaceId, policyId: id, performedBy: userId });
    return DrPolicyResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async findPolicyById(id: string, workspaceId?: string): Promise<DrPolicyResponseDto> {
    return DrPolicyResponseDto.from((await this.requirePolicy(id, workspaceId)) as unknown as Record<string, unknown>);
  }

  async findPolicies(workspaceId: string, filter: DrPolicyFilterDto): Promise<PaginatedDrPolicyResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? DISASTER_RECOVERY_CONSTANTS.DEFAULT_PAGE_SIZE, DISASTER_RECOVERY_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findPolicies({ ...filter, workspaceId } as IDrPolicyFilterOptions);
    return PaginatedDrPolicyResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  async getPolicyHistory(id: string, workspaceId?: string): Promise<DrPolicyHistoryResponseDto[]> {
    await this.requirePolicy(id, workspaceId);
    const raws = await this.repository.findPolicyHistory(id);
    return raws.map((r) => DrPolicyHistoryResponseDto.from(r as unknown as Record<string, unknown>));
  }

  // ── Recovery plans ────────────────────────────────────────────

  async createPlan(workspaceId: string, userId: string, userRole: string, dto: CreateDrRecoveryPlanDto): Promise<DrRecoveryPlanResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_plan', PermissionAction.CREATE);

    const effectiveWorkspaceId = dto.isGlobal ? null : workspaceId;
    const existing = await this.repository.findPlanByKey(effectiveWorkspaceId, dto.key);
    if (existing) {
      throw new DrPlanAlreadyExistsException(dto.key);
    }

    const targetValidation = this.validator.validatePlanTargets(dto.targets);
    if (!targetValidation.valid) {
      throw new DrPlanInvalidDefinitionException(targetValidation.issues.map((i) => i.message));
    }

    const policy = dto.policyId ? await this.requirePolicy(dto.policyId, workspaceId) : null;
    const stages = dto.stages ?? this.generateDefaultStages(dto.targets, policy, dto.requiresApproval ?? false, dto.approvalDefinitionKey);

    const definition = await this.workflowEngineService.createDefinition(workspaceId, userId, userRole, {
      key: `dr-plan-${dto.key}`,
      name: `Disaster Recovery Runbook: ${dto.name}`,
      stages,
      workflowKind: WorkflowKind.SEQUENTIAL,
      triggerType: WorkflowTriggerType.MANUAL,
      organizationId: dto.organizationId,
      isGlobal: dto.isGlobal,
    });

    const plan = await this.repository.createPlan({
      workspaceId: effectiveWorkspaceId,
      organizationId: dto.organizationId ?? null,
      policyId: dto.policyId ?? null,
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      scope: dto.scope,
      targets: dto.targets,
      workflowDefinitionId: definition.id,
      requiresApproval: dto.requiresApproval ?? false,
      approvalDefinitionKey: dto.approvalDefinitionKey ?? null,
      isTemplate: dto.isTemplate ?? false,
      dryRunDefault: dto.dryRunDefault ?? true,
      version: 1,
      status: DrPlanStatus.DRAFT,
      metadata: dto.metadata ?? {},
      createdBy: userId,
      updatedBy: userId,
    });

    await this.audit.logPlanChange(plan, 'Created', userId);
    await this.publishEvent(DrEvent.PLAN_CREATED, { workspaceId, planId: plan.id, performedBy: userId });
    await this.recordCentralAudit('disaster_recovery.plan.created', workspaceId, userId, { key: plan.key });
    return DrRecoveryPlanResponseDto.from(plan as unknown as Record<string, unknown>);
  }

  async updatePlan(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateDrRecoveryPlanDto): Promise<DrRecoveryPlanResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_plan', PermissionAction.UPDATE);
    const existing = await this.requirePlan(id, workspaceId);

    if (dto.targets) {
      const targetValidation = this.validator.validatePlanTargets(dto.targets);
      if (!targetValidation.valid) {
        throw new DrPlanInvalidDefinitionException(targetValidation.issues.map((i) => i.message));
      }
    }

    if (dto.stages || dto.targets) {
      await this.workflowEngineService.updateDefinition(existing.workflowDefinitionId, workspaceId, userId, userRole, {
        ...(dto.stages !== undefined && { stages: dto.stages }),
        changeReason: dto.changeReason ?? 'Updated via DR plan',
      });
    }

    const raw = await this.repository.updatePlan(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.targets !== undefined && { targets: dto.targets }),
      ...(dto.requiresApproval !== undefined && { requiresApproval: dto.requiresApproval }),
      ...(dto.approvalDefinitionKey !== undefined && { approvalDefinitionKey: dto.approvalDefinitionKey }),
      ...(dto.dryRunDefault !== undefined && { dryRunDefault: dto.dryRunDefault }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      ...((dto.stages || dto.targets) && { version: existing.version + 1 }),
      updatedBy: userId,
    });

    await this.audit.logPlanChange(raw, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(DrEvent.PLAN_UPDATED, { workspaceId, planId: id, performedBy: userId });
    return DrRecoveryPlanResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async publishPlan(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrRecoveryPlanResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_plan', PermissionAction.PUBLISH);
    const existing = await this.requirePlan(id, workspaceId);
    const allowed = DISASTER_RECOVERY_CONSTANTS.ALLOWED_PLAN_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(DrPlanStatus.PUBLISHED)) {
      throw new DrPlanInvalidDefinitionException([`Cannot publish a plan in status '${existing.status}'`]);
    }

    await this.workflowEngineService.publishDefinition(existing.workflowDefinitionId, workspaceId, userId, userRole);

    const raw = await this.repository.updatePlan(id, { status: DrPlanStatus.PUBLISHED, updatedBy: userId });
    await this.audit.logPlanChange(raw, 'Published', userId);
    await this.publishEvent(DrEvent.PLAN_PUBLISHED, { workspaceId, planId: id, performedBy: userId });
    return DrRecoveryPlanResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async archivePlan(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrRecoveryPlanResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_plan', PermissionAction.DELETE);
    const existing = await this.requirePlan(id, workspaceId);
    const allowed = DISASTER_RECOVERY_CONSTANTS.ALLOWED_PLAN_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(DrPlanStatus.ARCHIVED)) {
      throw new DrPlanInvalidDefinitionException([`Cannot archive a plan in status '${existing.status}'`]);
    }
    const raw = await this.repository.updatePlan(id, { status: DrPlanStatus.ARCHIVED, updatedBy: userId });
    await this.audit.logPlanChange(raw, 'Archived', userId);
    await this.publishEvent(DrEvent.PLAN_ARCHIVED, { workspaceId, planId: id, performedBy: userId });
    return DrRecoveryPlanResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async findPlanById(id: string, workspaceId?: string): Promise<DrRecoveryPlanResponseDto> {
    return DrRecoveryPlanResponseDto.from((await this.requirePlan(id, workspaceId)) as unknown as Record<string, unknown>);
  }

  async findPlans(workspaceId: string, filter: DrRecoveryPlanFilterDto): Promise<PaginatedDrRecoveryPlanResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? DISASTER_RECOVERY_CONSTANTS.DEFAULT_PAGE_SIZE, DISASTER_RECOVERY_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findPlans({ ...filter, workspaceId } as IDrPlanFilterOptions);
    return PaginatedDrRecoveryPlanResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  // ── Recovery execution ────────────────────────────────────────

  async triggerRecovery(
    workspaceId: string,
    userId: string,
    userRole: string,
    planId: string,
    dto: TriggerDrRecoveryDto,
  ): Promise<DrRecoveryExecutionResponseDto> {
    const plan = await this.requirePlan(planId, workspaceId);
    if (plan.status !== DrPlanStatus.PUBLISHED) {
      throw new DrPlanNotPublishedException(plan.key);
    }

    if (dto.idempotencyKey) {
      const existingExecution = await this.repository.findExecutionByIdempotencyKey(planId, dto.idempotencyKey);
      if (existingExecution) {
        return DrRecoveryExecutionResponseDto.from(existingExecution as unknown as Record<string, unknown>);
      }
    }

    const policy = plan.policyId ? await this.repository.findPolicyById(plan.policyId) : null;
    const targetWorkspaceIds = dto.targetWorkspaceIds ?? [];

    if (plan.scope === DrRecoveryScope.FULL_PLATFORM) {
      await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_full_platform_recovery', PermissionAction.ADMIN);
    } else {
      if (targetWorkspaceIds.length === 0) {
        throw new DrPlanInvalidDefinitionException(['targetWorkspaceIds is required for PARTIAL/TENANT-scoped recovery']);
      }
      await this.validator.assertTenantBoundary(targetWorkspaceIds);
    }

    const isDryRun = dto.isDryRun ?? plan.dryRunDefault;
    const scopeKey = this.lockService.buildScopeKey({
      scope: plan.scope,
      workspaceId: targetWorkspaceIds[0],
      criticalService: policy?.criticalService,
    });

    let execution = await this.repository.createExecution({
      workspaceId: plan.scope === DrRecoveryScope.FULL_PLATFORM ? null : targetWorkspaceIds[0],
      organizationId: plan.organizationId,
      planId,
      policyId: plan.policyId,
      scope: plan.scope,
      status: DrExecutionStatus.PENDING,
      isDryRun,
      triggerType: dto.triggerType ?? DrExecutionTrigger.MANUAL,
      triggeredBy: userId ?? SYSTEM_ACTOR_ID,
      targetWorkspaceIds,
      idempotencyKey: dto.idempotencyKey ?? null,
      currentCheckpointSequence: 0,
      metadata: { reason: dto.reason ?? null },
    });

    await this.lockService.acquire(scopeKey, execution.id);

    try {
      execution = await this.repository.updateExecution(execution.id, { status: DrExecutionStatus.VALIDATING });

      // Each target's eligibility check is read-only and independent (distinct target types), so they run concurrently
      // instead of one at a time — this sits directly on the recovery-trigger critical path (RTO-sensitive).
      const eligibilityResults = await Promise.all(
        plan.targets.map(async (target) => ({ target, eligibility: await this.validator.checkEligibility(targetWorkspaceIds[0] ?? null, target) })),
      );

      const validationWarnings: string[] = [];
      for (const { target, eligibility } of eligibilityResults) {
        if (!eligibility.eligible) {
          if (!isDryRun) {
            execution = await this.repository.updateExecution(execution.id, {
              status: DrExecutionStatus.FAILED,
              errorCode: 'BACKUP_NOT_ELIGIBLE',
              errorMessage: `Target '${target}': ${eligibility.reason}`,
              endedAt: new Date(),
            });
            await this.publishEvent(DrEvent.RECOVERY_VALIDATION_FAILED, { workspaceId, planId, executionId: execution.id, metadata: { target, reason: eligibility.reason } });
            await this.lockService.release(scopeKey);
            return DrRecoveryExecutionResponseDto.from(execution as unknown as Record<string, unknown>);
          }
          validationWarnings.push(`${target}: ${eligibility.reason}`);
        }
      }

      execution = await this.repository.updateExecution(execution.id, {
        status: DrExecutionStatus.RUNNING,
        metadata: { ...(execution.metadata as Record<string, unknown>), validationWarnings },
      });

      await this.publishEvent(DrEvent.RECOVERY_STARTED, { workspaceId, planId, executionId: execution.id, performedBy: userId });
      await this.recordCentralAudit('disaster_recovery.recovery.started', workspaceId, userId, { planId, scope: plan.scope, isDryRun });

      const workflowResult = await this.workflowEngineService.executeWorkflow(workspaceId, userId, {
        definitionId: plan.workflowDefinitionId,
        input: { isDryRun, targetWorkspaceIds },
        triggerType: WorkflowTriggerType.API,
        triggeredBy: userId,
        idempotencyKey: dto.idempotencyKey,
      });

      execution = await this.repository.updateExecution(execution.id, {
        workflowExecutionId: workflowResult.id,
        status: this.mapWorkflowStatus(workflowResult.status),
        errorCode: workflowResult.errorCode ?? null,
        errorMessage: workflowResult.errorMessage ?? null,
        ...(this.isTerminalWorkflowStatus(workflowResult.status) && {
          endedAt: new Date(),
          rtoActualMinutes: Math.round((Date.now() - execution.startedAt.getTime()) / 60000),
        }),
      });

      if (this.isTerminalWorkflowStatus(workflowResult.status)) {
        await this.lockService.release(scopeKey);
      }

      const finalEvent = workflowResult.status === WorkflowExecutionStatus.COMPLETED ? DrEvent.RECOVERY_COMPLETED : DrEvent.RECOVERY_FAILED;
      if (this.isTerminalWorkflowStatus(workflowResult.status)) {
        await this.publishEvent(finalEvent, { workspaceId, planId, executionId: execution.id, performedBy: userId, status: workflowResult.status });
      }

      return DrRecoveryExecutionResponseDto.from(execution as unknown as Record<string, unknown>);
    } catch (err) {
      execution = await this.repository.updateExecution(execution.id, {
        status: DrExecutionStatus.FAILED,
        errorCode: 'EXECUTION_ERROR',
        errorMessage: (err as Error).message,
        endedAt: new Date(),
      });
      await this.lockService.release(scopeKey);
      await this.publishEvent(DrEvent.RECOVERY_FAILED, { workspaceId, planId, executionId: execution.id, performedBy: userId });
      throw err;
    }
  }

  async detectDisaster(workspaceId: string | undefined, userId: string | undefined, dto: DetectDrDisasterDto): Promise<void> {
    await this.publishEvent(DrEvent.DISASTER_DETECTED, {
      workspaceId,
      metadata: { criticalService: dto.criticalService, description: dto.description, environment: dto.environment },
      performedBy: userId ?? SYSTEM_ACTOR_ID,
    });
    await this.recordCentralAudit('disaster_recovery.disaster.detected', workspaceId ?? 'platform', userId, { criticalService: dto.criticalService });

    const policy = await this.repository.findActivePolicy(workspaceId ?? null, dto.criticalService);
    if (!policy || policy.status !== DrPolicyStatus.ACTIVE || !policy.autoTriggerOnDetection) {
      return;
    }

    const [plans] = await this.repository.findPlans({ policyId: policy.id, status: DrPlanStatus.PUBLISHED, page: 1, limit: 1 });
    const plan = plans[0];
    if (!plan) {
      this.logger.warn(`Policy '${policy.id}' has autoTriggerOnDetection but no published recovery plan`);
      return;
    }

    try {
      await this.triggerRecovery(workspaceId ?? '', SYSTEM_ACTOR_ID, 'SYSTEM', plan.id, {
        isDryRun: false,
        targetWorkspaceIds: workspaceId ? [workspaceId] : [],
        triggerType: DrExecutionTrigger.DETECTED_DISASTER,
        reason: dto.description,
      });
    } catch (err) {
      this.logger.error(`Auto-triggered recovery failed for policy '${policy.id}': ${(err as Error).message}`);
    }
  }

  async cancelExecution(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrRecoveryExecutionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_execution', PermissionAction.UPDATE);
    const execution = await this.requireExecution(id);
    if (!DISASTER_RECOVERY_CONSTANTS.ACTIVE_EXECUTION_STATUSES.has(execution.status)) {
      throw new DrExecutionInvalidStateTransitionException(execution.status, 'cancel');
    }
    const updated = await this.repository.updateExecution(id, { status: DrExecutionStatus.CANCELLED, endedAt: new Date() });
    await this.publishEvent(DrEvent.RECOVERY_CANCELLED, { workspaceId, executionId: id, performedBy: userId });
    return DrRecoveryExecutionResponseDto.from(updated as unknown as Record<string, unknown>);
  }

  /**
   * Marks completed checkpoints ROLLED_BACK and records the rollback
   * decision — per-target rollback mechanics are delegated to the same
   * step executors' compensation paths already triggered automatically
   * by the Enterprise Workflow Engine on step failure. This method does
   * not attempt to reconstruct pre-recovery state from scratch.
   */
  async rollbackExecution(id: string, workspaceId: string, userId: string, userRole: string): Promise<DrRecoveryExecutionResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_execution', PermissionAction.MANAGE);
    const execution = await this.requireExecution(id);
    if (execution.status !== DrExecutionStatus.COMPLETED && execution.status !== DrExecutionStatus.FAILED) {
      throw new DrExecutionInvalidStateTransitionException(execution.status, 'rollback');
    }

    await this.repository.updateExecution(id, { status: DrExecutionStatus.ROLLING_BACK });
    const checkpoints = await this.repository.listCheckpoints(id);
    for (const checkpoint of checkpoints) {
      await this.repository.updateCheckpoint(checkpoint.id, { status: DrCheckpointStatus.ROLLED_BACK });
    }

    const updated = await this.repository.updateExecution(id, { status: DrExecutionStatus.COMPLETED, endedAt: new Date() });
    await this.recordCentralAudit('disaster_recovery.recovery.rolled_back', workspaceId, userId, { executionId: id });
    await this.publishEvent(DrEvent.RECOVERY_ROLLED_BACK, { workspaceId, executionId: id, performedBy: userId });
    return DrRecoveryExecutionResponseDto.from(updated as unknown as Record<string, unknown>);
  }

  /** Operator escape hatch for a lock stuck beyond its TTL because the underlying workflow is still WAITING (e.g. on approval) long after the synchronous trigger call returned. */
  async forceReleaseLock(scopeKey: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'dr_execution', PermissionAction.ADMIN);
    await this.lockService.release(scopeKey);
    await this.recordCentralAudit('disaster_recovery.lock.force_released', workspaceId, userId, { scopeKey });
  }

  async getExecutionById(id: string): Promise<DrRecoveryExecutionResponseDto> {
    const execution = await this.requireExecution(id);
    const checkpoints = await this.repository.listCheckpoints(id);
    return DrRecoveryExecutionResponseDto.from({ ...execution, checkpoints } as unknown as Record<string, unknown>);
  }

  async findExecutions(workspaceId: string, filter: DrExecutionFilterDto): Promise<PaginatedDrRecoveryExecutionResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? DISASTER_RECOVERY_CONSTANTS.DEFAULT_PAGE_SIZE, DISASTER_RECOVERY_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findExecutions({ ...filter, workspaceId } as IDrExecutionFilterOptions);
    return PaginatedDrRecoveryExecutionResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private generateDefaultStages(
    targets: string[],
    policy: IDrPolicy | null,
    requiresApproval: boolean,
    approvalDefinitionKey?: string,
  ): unknown[] {
    const orderedTargets = policy?.dependencyOrder?.length
      ? [...targets].sort((a, b) => policy.dependencyOrder.indexOf(a) - policy.dependencyOrder.indexOf(b))
      : targets;

    const stages: unknown[] = [];

    if (requiresApproval && approvalDefinitionKey) {
      stages.push({
        id: 'approval',
        name: 'Recovery Approval',
        steps: [{ id: 'approval-step', type: 'APPROVAL', name: 'Approve recovery execution', config: { definitionKey: approvalDefinitionKey } }],
      });
    }

    for (const target of orderedTargets) {
      stages.push({
        id: `recover-${target.toLowerCase()}`,
        name: `Recover ${target}`,
        steps: [
          { id: `${target}-discover`, type: 'BACKUP_DISCOVERY', name: `Discover backups for ${target}`, config: { targetType: target } },
          { id: `${target}-validate`, type: 'VALIDATE_BACKUP', name: `Validate backup for ${target}`, config: { targetType: target } },
          { id: `${target}-restore`, type: 'RESTORE_TARGET', name: `Restore ${target}`, config: { targetType: target } },
        ],
      });
    }

    stages.push({
      id: 'post-restore-health',
      name: 'Post-Restore Health Check',
      steps: [{ id: 'health-check', type: 'HEALTH_CHECK', name: 'Verify post-restore health', config: {} }],
    });

    return stages;
  }

  private mapWorkflowStatus(status: WorkflowExecutionStatus): DrExecutionStatus {
    switch (status) {
      case WorkflowExecutionStatus.COMPLETED:
        return DrExecutionStatus.COMPLETED;
      case WorkflowExecutionStatus.FAILED:
      case WorkflowExecutionStatus.TIMEOUT:
        return DrExecutionStatus.FAILED;
      case WorkflowExecutionStatus.CANCELLED:
        return DrExecutionStatus.CANCELLED;
      case WorkflowExecutionStatus.WAITING:
        return DrExecutionStatus.AWAITING_APPROVAL;
      case WorkflowExecutionStatus.PAUSED:
        return DrExecutionStatus.PAUSED;
      default:
        return DrExecutionStatus.RUNNING;
    }
  }

  private isTerminalWorkflowStatus(status: WorkflowExecutionStatus): boolean {
    return status === WorkflowExecutionStatus.COMPLETED || status === WorkflowExecutionStatus.FAILED || status === WorkflowExecutionStatus.CANCELLED || status === WorkflowExecutionStatus.TIMEOUT;
  }

  private async requirePolicy(id: string, workspaceId?: string): Promise<IDrPolicy> {
    const policy = await this.repository.findPolicyById(id);
    if (!policy) throw new DrPolicyNotFoundException(id);
    if (workspaceId !== undefined && policy.workspaceId !== null && policy.workspaceId !== workspaceId) {
      throw new DrPolicyNotFoundException(id);
    }
    return policy;
  }

  private async requirePlan(id: string, workspaceId?: string): Promise<IDrRecoveryPlan> {
    const plan = await this.repository.findPlanById(id);
    if (!plan) throw new DrPlanNotFoundException(id);
    if (workspaceId !== undefined && plan.workspaceId !== null && plan.workspaceId !== workspaceId) {
      throw new DrPlanNotFoundException(id);
    }
    return plan;
  }

  private async requireExecution(id: string): Promise<IDrRecoveryExecution> {
    const execution = await this.repository.findExecutionById(id);
    if (!execution) throw new DrExecutionNotFoundException(id);
    return execution;
  }

  private async publishEvent(
    event: DrEvent,
    fields: { workspaceId?: string | null; policyId?: string; planId?: string; executionId?: string; performedBy?: string; status?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      workspaceId: fields.workspaceId ?? null,
      policyId: fields.policyId,
      planId: fields.planId,
      executionId: fields.executionId,
      status: fields.status,
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
        module: DISASTER_RECOVERY_MODULE,
        entityType: 'DisasterRecovery',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
