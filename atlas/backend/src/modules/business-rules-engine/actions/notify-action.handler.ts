import { Injectable } from '@nestjs/common';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationTargetType, NotificationPriority, NotificationType } from '@modules/notifications/interfaces';
import { IRuleActionHandler, IRuleActionHandlerContext, RuleActionType } from '../interfaces';
import { BUSINESS_RULES_ENGINE_MODULE } from '../constants';

@Injectable()
export class NotifyActionHandler implements IRuleActionHandler {
  readonly actionType = RuleActionType.NOTIFY;

  constructor(private readonly notificationsService: NotificationsService) {}

  async execute(context: IRuleActionHandlerContext): Promise<unknown> {
    const { rule, evaluation, action } = context;
    const config = action.config;

    const dto: CreateNotificationDto = {
      workspaceId: evaluation.workspaceId,
      targetType: (config.targetType as NotificationTargetType) ?? NotificationTargetType.ROLE,
      targetUserId: config.targetUserId as string | undefined,
      targetRole: config.targetRole as string | undefined,
      targetUserIds: config.targetUserIds as string[] | undefined,
      type: config.type as NotificationType | undefined,
      category: (config.category as string) ?? rule.module,
      priority: (config.priority as NotificationPriority) ?? NotificationPriority.NORMAL,
      title: config.title as string,
      message: config.message as string,
      sourceModule: BUSINESS_RULES_ENGINE_MODULE,
      entityType: evaluation.entityType,
      entityId: evaluation.entityId,
      metadata: { ruleId: rule.id, ruleKey: rule.key, module: rule.module },
    };

    return this.notificationsService.create(dto);
  }
}
