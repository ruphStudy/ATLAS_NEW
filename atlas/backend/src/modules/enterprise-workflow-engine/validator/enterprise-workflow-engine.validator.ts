import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { MultiBusinessService } from '@modules/multi-business/multi-business.service';
import { CONTROL_FLOW_STEP_TYPES, IWorkflowStageDefinition } from '../interfaces';
import { WorkflowStepExecutorRegistry } from '../registry/workflow-step-executor.registry';
import { WorkflowAccessDeniedException } from '../exceptions/enterprise-workflow-engine.exceptions';
import { WORKFLOW_ENGINE_MODULE } from '../constants';

export interface IWorkflowStructureValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * EnterpriseWorkflowEngineValidator
 *
 * Structural validation of a definition's stage/step graph (unique ids,
 * resolvable onSuccess/onFailure references, resolvable step types), and
 * permission enforcement via the existing `PermissionResolverService` —
 * no permission model is re-implemented here.
 */
@Injectable()
export class EnterpriseWorkflowEngineValidator {
  constructor(
    private readonly stepExecutorRegistry: WorkflowStepExecutorRegistry,
    private readonly permissionResolver: PermissionResolverService,
    private readonly multiBusinessService: MultiBusinessService,
  ) {}

  /** Soft existence check — a missing business only produces a warning, never blocks the definition from staying DRAFT. */
  async validateBusinessRef(businessId: string | undefined, workspaceId: string | undefined): Promise<string[]> {
    if (!businessId) return [];
    try {
      await this.multiBusinessService.findBusinessById(businessId, workspaceId);
      return [];
    } catch {
      return [`Business '${businessId}' was not found — this definition can stay DRAFT until it is`];
    }
  }

  validateStructure(stages: unknown[]): IWorkflowStructureValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(stages) || stages.length === 0) {
      return { valid: false, errors: ['stages must be a non-empty array'], warnings };
    }

    const stepIds = new Set<string>();
    const allSteps: { stageId: string; step: Record<string, unknown> }[] = [];

    for (const rawStage of stages) {
      const stage = rawStage as Record<string, unknown>;
      if (!stage['id'] || !stage['name'] || !Array.isArray(stage['steps'])) {
        errors.push(`Each stage requires an 'id', 'name' and 'steps' array (got: ${JSON.stringify(stage)})`);
        continue;
      }
      for (const rawStep of stage['steps'] as unknown[]) {
        const step = rawStep as Record<string, unknown>;
        if (!step['id'] || !step['type'] || !step['name']) {
          errors.push(`Each step requires an 'id', 'type' and 'name' (stage '${stage['id']}')`);
          continue;
        }
        if (stepIds.has(step['id'] as string)) {
          errors.push(`Duplicate step id '${step['id']}'`);
        }
        stepIds.add(step['id'] as string);
        allSteps.push({ stageId: stage['id'] as string, step });
      }
    }

    for (const { step } of allSteps) {
      for (const ref of (step['onSuccess'] as string[] | undefined) ?? []) {
        if (!stepIds.has(ref)) errors.push(`Step '${step['id']}' has onSuccess reference to unknown step '${ref}'`);
      }
      for (const ref of (step['onFailure'] as string[] | undefined) ?? []) {
        if (!stepIds.has(ref)) errors.push(`Step '${step['id']}' has onFailure reference to unknown step '${ref}'`);
      }

      const type = step['type'] as string;
      if (!CONTROL_FLOW_STEP_TYPES.includes(type) && !this.stepExecutorRegistry.has(type)) {
        warnings.push(`Step '${step['id']}' has type '${type}' which has no registered executor yet — this definition can stay DRAFT until one is registered`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /** Stricter check used before PUBLISH — every non-control-flow step type must resolve to a registered executor. */
  assertPublishable(stages: IWorkflowStageDefinition[]): string[] {
    const unresolved: string[] = [];
    for (const stage of stages) {
      for (const step of stage.steps) {
        if (!CONTROL_FLOW_STEP_TYPES.includes(step.type) && !this.stepExecutorRegistry.has(step.type)) {
          unresolved.push(`Step '${step.id}' (type '${step.type}') has no registered executor`);
        }
      }
    }
    return unresolved;
  }

  async assertPermission(
    userId: string,
    workspaceId: string,
    legacyRole: string,
    resource: string,
    action: PermissionAction,
  ): Promise<void> {
    const allowed = await this.permissionResolver.hasPermission({
      userId,
      workspaceId,
      legacyRole,
      module: WORKFLOW_ENGINE_MODULE,
      resource,
      action,
    });
    if (!allowed) {
      throw new WorkflowAccessDeniedException(`${action} ${resource}`);
    }
  }
}
