import { Injectable } from '@nestjs/common';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationTargetType, NotificationPriority, NotificationType } from '@modules/notifications/interfaces';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';
import { WORKFLOW_ENGINE_MODULE } from '../constants';

/**
 * NotificationStepExecutor — a NOTIFICATION step is fire-and-forget: it
 * completes immediately once the notification has been created.
 */
@Injectable()
export class NotificationStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.NOTIFICATION;

  constructor(private readonly notificationsService: NotificationsService) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const { step, execution } = ctx;
    const config = step.config;

    const dto: CreateNotificationDto = {
      workspaceId: execution.workspaceId,
      targetType: (config.targetType as NotificationTargetType) ?? NotificationTargetType.ROLE,
      targetUserId: config.targetUserId as string | undefined,
      targetRole: config.targetRole as string | undefined,
      targetUserIds: config.targetUserIds as string[] | undefined,
      type: config.type as NotificationType | undefined,
      category: (config.category as string) ?? WORKFLOW_ENGINE_MODULE,
      priority: (config.priority as NotificationPriority) ?? NotificationPriority.NORMAL,
      title: (config.title as string) ?? step.name,
      message: config.message as string,
      sourceModule: WORKFLOW_ENGINE_MODULE,
      entityType: config.entityType as string | undefined,
      entityId: config.entityId as string | undefined,
      metadata: { workflowDefinitionId: execution.definitionId, workflowExecutionId: execution.id, stepId: step.id },
    };

    const notification = await this.notificationsService.create(dto);

    return {
      status: WorkflowStepStatus.COMPLETED,
      output: { notificationId: (notification as unknown as { id: string }).id },
    };
  }
}
