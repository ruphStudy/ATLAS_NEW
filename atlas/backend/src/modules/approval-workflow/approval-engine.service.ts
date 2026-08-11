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
} from './interfaces';

interface IConditionContext {
  amount?: number | null;
  riskLevel?: string | null;
  entityType?: string;
}

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

  /** Creates all step instances for a freshly-started request, activating the first eligible one(s). */
  async initializeSteps(
    workspaceId: string,
    request: IApprovalRequest,
    definition: IApprovalWorkflowDefinition,
  ): Promise<{ stepInstances: IApprovalStepInstance[]; allSkipped: boolean }> {
    const sortedSteps = [...definition.steps].sort((a, b) => a.stepOrder - b.stepOrder);
    const ctx: IConditionContext = { amount: request.amount, riskLevel: request.riskLevel, entityType: request.entityType };
    const isParallel = definition.mode === ApprovalWorkflowMode.PARALLEL;

    let firstActiveAssigned = false;
    const created: IApprovalStepInstance[] = [];

    for (let i = 0; i < sortedSteps.length; i++) {
      const stepConfig = sortedSteps[i];
      const shouldSkip =
        definition.mode === ApprovalWorkflowMode.CONDITIONAL && stepConfig.condition
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
            requiredApprovals: stepConfig.requiredApprovals ?? 1,
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
        requiredApprovals: stepConfig.requiredApprovals ?? 1,
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
}
