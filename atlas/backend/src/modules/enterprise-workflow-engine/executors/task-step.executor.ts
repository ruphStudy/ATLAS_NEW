import { Injectable } from '@nestjs/common';
import { TaskManagementService } from '@modules/task-management/task-management.service';
import { CreateTaskDto } from '@modules/task-management/dto';
import { TaskSource, TaskPriority, TaskAssigneeType } from '@modules/task-management/interfaces';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';
import { SYSTEM_ACTOR_ID } from '../constants';

/**
 * TaskStepExecutor — a TASK step creates a human task and pauses the
 * workflow (human-in-the-loop) until the task is completed via
 * `resumeStepExecution`.
 */
@Injectable()
export class TaskStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.TASK;

  constructor(private readonly taskManagementService: TaskManagementService) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const { step, execution, userId } = ctx;
    const config = step.config;

    const dto: CreateTaskDto = {
      title: (config.title as string) ?? step.name,
      description: config.description as string | undefined,
      source: TaskSource.SYSTEM_GENERATED,
      taskType: config.taskType as string | undefined,
      priority: (config.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      module: (config.module as string) ?? 'enterprise-workflow-engine',
      entityType: config.entityType as string | undefined,
      entityId: config.entityId as string | undefined,
      assigneeType: (config.assigneeType as TaskAssigneeType) ?? (step.assigneeRef ? TaskAssigneeType.USER : undefined),
      assigneeRef: (config.assigneeRef as string) ?? step.assigneeRef,
      dueAt: step.slaMs ? new Date(Date.now() + step.slaMs).toISOString() : (config.dueAt as string | undefined),
      sourceReference: { workflowExecutionId: execution.id, stepId: step.id },
      metadata: { workflowDefinitionId: execution.definitionId, workflowExecutionId: execution.id, stepId: step.id },
    };

    const task = await this.taskManagementService.createTask(execution.workspaceId, userId ?? SYSTEM_ACTOR_ID, dto);

    return {
      status: WorkflowStepStatus.WAITING,
      output: { taskId: task.id },
      externalRef: task.id,
    };
  }
}
