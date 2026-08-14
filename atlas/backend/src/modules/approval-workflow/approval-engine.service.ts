import { Injectable } from '@nestjs/common';
import { ApprovalWorkflowRepository } from './approval-workflow.repository';
import {
  IApprovalWorkflowDefinition,
  IApprovalRequest,
  IApprovalStepInstance,
  IApprovalStepConfig,
  IApprovalCondition,
  ApprovalWorkflowMode,
  ApprovalStepStatus,
  ApprovalAssignmentStatus,
  ApprovalStrategy,
  ApproverType,
} from './interfaces';

interface IConditionContext {
  amount?: number | null;
  riskLevel?: string | null;
  entityType?: string;
  countryCode?: string | null;
  marketplaceKey?: string | null;
}

/** MATRIX behaves like PARALLEL (every eligible step activates together) but, like CONDITIONAL, each step's own `condition` decides whether it's relevant to this request — a grid of approver-by-criteria rather than one linear/parallel chain. */
const PARALLEL_ACTIVATION_MODES: ApprovalWorkflowMode[] = [ApprovalWorkflowMode.PARALLEL, ApprovalWorkflowMode.MATRIX];
const CONDITION_EVALUATED_MODES: ApprovalWorkflowMode[] = [ApprovalWorkflowMode.CONDITIONAL, ApprovalWorkflowMode.MATRIX];

/**
 * ApprovalEngineService — the generic step/condition/routing machinery.
 * Interprets a workflow definition's `steps`/`mode`/`condition` Json shape
 * only; it never knows anything about the owning module's business rules
 * ("Keep approval logic generic; owning modules retain their business
 * rules").
 */
@Injectable()
export class ApprovalEngineService {
  constructor(private readonly repository: ApprovalWorkflowRepository) {}

  evaluateCondition(condition: IApprovalCondition, ctx: IConditionContext): boolean {
    const actual = ctx[condition.field];
    switch (condition.operator) {
      case 'eq':
        return actual === condition.value;
      case 'neq':
        return actual !== condition.value;
      case 'gte':
        return typeof actual === 'number' && typeof condition.value === 'number' && actual >= condition.value;
      case 'lte':
        return typeof actual === 'number' && typeof condition.value === 'number' && actual <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && (condition.value as unknown[]).includes(actual);
      default:
        return false;
    }
  }

  /** Resolves the effective N-of-M threshold for a step given its strategy — QUORUM (or unset) keeps the pre-existing fixed `requiredApprovals` behavior; the named strategies compute the threshold off the step's own assignee count. */
  resolveRequiredApprovals(stepConfig: IApprovalStepConfig): number {
    const totalAssignees = Math.max(1, stepConfig.approverRefs.length);
    switch (stepConfig.strategy) {
      case ApprovalStrategy.ANY_ONE:
        return 1;
      case ApprovalStrategy.MAJORITY:
        return Math.floor(totalAssignees / 2) + 1;
      case ApprovalStrategy.UNANIMOUS:
        return totalAssignees;
      case ApprovalStrategy.QUORUM:
      default:
        return stepConfig.requiredApprovals ?? 1;
    }
  }

  /** Creates all step instances for a freshly-started request, activating the first eligible one(s). */
  async initializeSteps(
    workspaceId: string,
    request: IApprovalRequest,
    definition: IApprovalWorkflowDefinition,
  ): Promise<{ stepInstances: IApprovalStepInstance[]; allSkipped: boolean }> {
    const sortedSteps = [...definition.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const ctx: IConditionContext = {
      amount: request.amount,
      riskLevel: request.riskLevel,
      entityType: request.entityType,
      countryCode: request.countryCode,
      marketplaceKey: request.marketplaceKey,
    };
    const isParallel = PARALLEL_ACTIVATION_MODES.includes(definition.mode);

    let firstActiveAssigned = false;
    const created: IApprovalStepInstance[] = [];

    for (let i = 0; i < sortedSteps.length; i++) {
      const stepConfig = sortedSteps[i];
      const shouldSkip =
        CONDITION_EVALUATED_MODES.includes(definition.mode) && stepConfig.condition
          ? !this.evaluateCondition(stepConfig.condition, ctx)
          : false;

      if (shouldSkip) {
        created.push(
          await this.repository.createStepInstance({
            requestId: request.id,
            workspaceId,
            stepIndex: i,
            name: stepConfig.name,
            status: ApprovalStepStatus.SKIPPED,
            strategy: stepConfig.strategy ?? ApprovalStrategy.QUORUM,
            requiredApprovals: this.resolveRequiredApprovals(stepConfig),
            completedAt: new Date(),
          }),
        );
        continue;
      }

      const shouldActivateNow = isParallel || !firstActiveAssigned;
      const slaHours = stepConfig.slaHours ?? definition.slaHours ?? undefined;
      const stepInstance = await this.repository.createStepInstance({
        requestId: request.id,
        workspaceId,
        stepIndex: i,
        name: stepConfig.name,
        status: shouldActivateNow ? ApprovalStepStatus.IN_PROGRESS : ApprovalStepStatus.PENDING,
        strategy: stepConfig.strategy ?? ApprovalStrategy.QUORUM,
        requiredApprovals: this.resolveRequiredApprovals(stepConfig),
        startedAt: shouldActivateNow ? new Date() : null,
        dueAt: shouldActivateNow && slaHours ? new Date(Date.now() + slaHours * 3_600_000) : null,
      });

      if (shouldActivateNow) {
        await this.materializeAssignments(workspaceId, request.id, stepInstance.id, stepConfig);
        firstActiveAssigned = true;
      }

      created.push(stepInstance);
    }

    return { stepInstances: created, allSkipped: created.every((s) => s.status === ApprovalStepStatus.SKIPPED) };
  }

  /** Activates the next PENDING step after the request's current step index (SEQUENTIAL-style modes only). Returns null once none remain. */
  async activateNextStep(
    workspaceId: string,
    definition: IApprovalWorkflowDefinition,
    request: IApprovalRequest,
  ): Promise<IApprovalStepInstance | null> {
    const steps = await this.repository.listStepInstances(request.id);
    const sortedConfigs = [...definition.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const next = steps.find((s) => s.stepIndex > request.currentStepIndex && s.status === ApprovalStepStatus.PENDING);
    if (!next) {
      return null;
    }

    const stepConfig = sortedConfigs[next.stepIndex];
    const slaHours = stepConfig.slaHours ?? definition.slaHours ?? undefined;
    const activated = await this.repository.updateStepInstance(next.id, {
      status: ApprovalStepStatus.IN_PROGRESS,
      startedAt: new Date(),
      dueAt: slaHours ? new Date(Date.now() + slaHours * 3_600_000) : null,
    });
    await this.materializeAssignments(workspaceId, request.id, activated.id, stepConfig);
    return activated;
  }

  async areAllStepsResolved(requestId: string): Promise<boolean> {
    const steps = await this.repository.listStepInstances(requestId);
    return steps.every((s) => s.status === ApprovalStepStatus.APPROVED || s.status === ApprovalStepStatus.SKIPPED);
  }

  private async materializeAssignments(
    workspaceId: string,
    requestId: string,
    stepInstanceId: string,
    stepConfig: IApprovalStepConfig,
  ): Promise<void> {
    for (const ref of stepConfig.approverRefs) {
      await this.repository.createAssignment({
        stepInstanceId,
        requestId,
        workspaceId,
        approverType: stepConfig.approverType,
        approverRef: ref,
        status: ApprovalAssignmentStatus.PENDING,
      });
    }
  }

  /**
   * Materializes fresh PENDING assignments for a step's escalation targets
   * (role keys and/or user ids from `IApprovalEscalationConfig`), on top of
   * whatever assignments already exist — the original approvers remain
   * eligible to act, escalation only widens who else can now decide.
   * Returns the number of assignments created.
   */
  async escalateStep(
    workspaceId: string,
    requestId: string,
    stepInstanceId: string,
    escalation: { escalateToRoleKeys?: string[]; escalateToUserIds?: string[] } | null | undefined,
  ): Promise<number> {
    if (!escalation) return 0;
    let created = 0;
    for (const roleKey of escalation.escalateToRoleKeys ?? []) {
      await this.repository.createAssignment({
        stepInstanceId,
        requestId,
        workspaceId,
        approverType: ApproverType.ROLE,
        approverRef: roleKey,
        status: ApprovalAssignmentStatus.PENDING,
      });
      created++;
    }
    for (const userId of escalation.escalateToUserIds ?? []) {
      await this.repository.createAssignment({
        stepInstanceId,
        requestId,
        workspaceId,
        approverType: ApproverType.USER,
        approverRef: userId,
        status: ApprovalAssignmentStatus.PENDING,
      });
      created++;
    }
    return created;
  }
}
