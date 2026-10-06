import { Injectable } from '@nestjs/common';
import { TaskManagementService } from '@modules/task-management/task-management.service';
import { CreateTaskDto } from '@modules/task-management/dto';
import { TaskSource, TaskPriority, TaskAssigneeType } from '@modules/task-management/interfaces';
import { IRuleActionHandler, IRuleActionHandlerContext, RuleActionType } from '../interfaces';
import { SYSTEM_ACTOR_ID } from '../constants';

@Injectable()
export class CreateTaskActionHandler implements IRuleActionHandler {
  readonly actionType = RuleActionType.CREATE_TASK;

  constructor(private readonly taskManagementService: TaskManagementService) {}

  async execute(context: IRuleActionHandlerContext): Promise<unknown> {
    const { rule, evaluation, action } = context;
    const config = action.config;

    const dto: CreateTaskDto = {
      title: config.title as string,
      description: config.description as string | undefined,
      source: TaskSource.SYSTEM_GENERATED,
      taskType: config.taskType as string | undefined,
      priority: (config.priority as TaskPriority) ?? TaskPriority.MEDIUM,
      module: rule.module,
      entityType: evaluation.entityType,
      entityId: evaluation.entityId,
      assigneeType: config.assigneeType as TaskAssigneeType | undefined,
      assigneeRef: config.assigneeRef as string | undefined,
      dueAt: config.dueAt as string | undefined,
      sourceReference: { ruleId: rule.id, ruleKey: rule.key },
      metadata: { ruleId: rule.id, ruleKey: rule.key },
    };

    return this.taskManagementService.createTask(evaluation.workspaceId, evaluation.userId ?? SYSTEM_ACTOR_ID, dto);
  }
}
