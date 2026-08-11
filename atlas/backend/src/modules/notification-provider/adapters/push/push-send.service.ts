import { Injectable } from '@nestjs/common';
import { PushDeviceTokenService } from './push-device-token.service';
import { NotificationDeliveryService } from '../../delivery/notification-delivery.service';
import { SendPushNotificationDto } from './push-send.dto';
import { SendNotificationDto, SendNotificationResponseDto } from '../../dto';
import { NotificationProviderChannel } from '../../../../notification-provider/interfaces';

/**
 * Resolves a push send's target (device/user/topic/segment/platform) to
 * concrete device tokens via `PushDeviceTokenService`, then delegates to
 * the generic `NotificationDeliveryService.send()` — reusing its
 * idempotency/retry/scheduling/status-ledger machinery rather than
 * duplicating it. Push-specific content fields (image/icon/sound/badge/
 * deepLink/actions/data) are threaded through the same "channel extras via
 * metadata" convention the email/SMS/WhatsApp adapters use.
 */
@Injectable()
export class PushSendService {
  constructor(
    private readonly deviceTokenService: PushDeviceTokenService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  async send(dto: SendPushNotificationDto): Promise<SendNotificationResponseDto> {
    const tokens = await this.deviceTokenService.resolveTargets(
      dto.workspaceId,
      dto.targetType,
      dto.targetValue,
      dto.platform,
    );

    const sendDto: SendNotificationDto = {
      workspaceId: dto.workspaceId,
      channel: NotificationProviderChannel.PUSH,
      recipients: tokens.map((t) => ({
        address: t.token,
        metadata: { userId: t.userId ?? undefined, platform: t.platform ?? dto.platform },
      })),
      subject: dto.title,
      body: dto.body,
      idempotencyKey: dto.idempotencyKey,
      scheduledAt: dto.scheduledAt,
      preferredProviderKey: dto.preferredProviderKey,
      notificationId: dto.notificationId,
      metadata: {
        ...dto.metadata,
        image: dto.image,
        icon: dto.icon,
        sound: dto.sound,
        badge: dto.badge,
        deepLink: dto.deepLink,
        actions: dto.actions,
        data: dto.data,
        platform: dto.platform,
      },
    };

    return this.deliveryService.send(sendDto);
  }
}
