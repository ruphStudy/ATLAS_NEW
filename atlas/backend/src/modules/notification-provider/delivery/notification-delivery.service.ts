import { Injectable, Logger } from '@nestjs/common';
import { generateUUID } from '@common/utils';
import { AtlasException } from '@common/exceptions';
import { NotificationDeliveryRepository } from './notification-delivery.repository';
import { NotificationProviderConfigurationService } from '../configuration/notification-provider-configuration.service';
import { NotificationProviderCredentialService } from '../credentials/notification-provider-credential.service';
import { NotificationProviderEventQueue } from '../jobs';
import {
  SendNotificationDto,
  NotificationRecipientDto,
  DeliveryFilterDto,
  PaginatedDeliveryResponseDto,
  SendNotificationResponseDto,
} from '../dto';
import { INotificationDelivery, NotificationProviderPersistedEvent } from '../interfaces';
import {
  NotificationDeliveryNotFoundException,
  NotificationDeliveryInvalidTransitionException,
} from '../exceptions/notification-provider-persisted.exceptions';
import { NotificationProviderRegistry } from '../../../notification-provider/registry/notification-provider.registry';
import { NotificationProviderExecutor } from '../../../notification-provider/execution/notification-provider.executor';
import {
  NotificationProviderChannel,
  NotificationDeliveryStatus,
  INotificationExecutionResolution,
  INotificationSendRequest,
} from '../../../notification-provider/interfaces';
import { NotificationProviderDisabledException } from '../../../notification-provider/exceptions/notification-provider.exceptions';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private readonly repository: NotificationDeliveryRepository,
    private readonly configService: NotificationProviderConfigurationService,
    private readonly credentialService: NotificationProviderCredentialService,
    private readonly foundationRegistry: NotificationProviderRegistry,
    private readonly executor: NotificationProviderExecutor,
    private readonly eventQueue: NotificationProviderEventQueue,
  ) {}

  async send(dto: SendNotificationDto): Promise<SendNotificationResponseDto> {
    const batchId = generateUUID();
    const deliveryIds: string[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of dto.recipients) {
      const deliveryId = await this.sendToRecipient(dto, recipient, batchId);
      deliveryIds.push(deliveryId.id);
      if (deliveryId.status === NotificationDeliveryStatus.FAILED) {
        failedCount++;
      } else if (
        deliveryId.status === NotificationDeliveryStatus.SENT ||
        deliveryId.status === NotificationDeliveryStatus.DELIVERED
      ) {
        sentCount++;
      }
    }

    return {
      batchId,
      totalRecipients: dto.recipients.length,
      sentCount,
      failedCount,
      deliveryIds,
    };
  }

  private async sendToRecipient(
    dto: SendNotificationDto,
    recipient: NotificationRecipientDto,
    batchId: string,
  ): Promise<{ id: string; status: string }> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotency(
        dto.workspaceId,
        dto.idempotencyKey,
        recipient.address,
      );
      if (existing) {
        return { id: existing.id, status: existing.status };
      }
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    const isScheduled = !!scheduledAt && scheduledAt.getTime() > Date.now();

    // The full send payload (body/html/text/cc/bcc/replyTo/template/
    // attachments) is persisted into `metadata` — never returned by
    // DeliveryResponseDto — so a scheduled send can be dispatched later
    // with the exact same content, not just a preview.
    const deliveryMetadata = {
      ...dto.metadata,
      recipientMetadata: recipient.metadata,
      body: dto.body,
      html: dto.html,
      text: dto.text,
      cc: dto.cc,
      bcc: dto.bcc,
      replyTo: dto.replyTo,
      fromAddress: dto.fromAddress,
      fromName: dto.fromName,
      senderId: dto.senderId,
      countryCode: dto.countryCode,
      template: dto.template,
      attachments: dto.attachments,
      priority: dto.priority,
      preferredProviderKey: dto.preferredProviderKey,
    };

    const delivery = await this.repository.create({
      workspaceId: dto.workspaceId,
      notificationId: dto.notificationId,
      channel: dto.channel,
      recipientAddress: recipient.address,
      recipientName: recipient.name,
      subject: dto.subject,
      messagePreview: dto.body ? dto.body.slice(0, 280) : undefined,
      templateId: dto.template?.templateId,
      status: isScheduled ? NotificationDeliveryStatus.QUEUED : NotificationDeliveryStatus.PENDING,
      attemptNumber: 1,
      idempotencyKey: dto.idempotencyKey,
      scheduledAt,
      batchId,
      metadata: deliveryMetadata,
    });

    if (isScheduled) {
      await this.eventQueue.publish({
        event: NotificationProviderPersistedEvent.DELIVERY_QUEUED,
        workspaceId: dto.workspaceId,
        deliveryId: delivery.id,
        batchId,
      });
      return { id: delivery.id, status: delivery.status };
    }

    return this.dispatch(delivery);
  }

  private async dispatch(
    delivery: INotificationDelivery,
  ): Promise<{ id: string; status: string }> {
    const startTime = Date.now();
    const meta = (delivery.metadata ?? {}) as Record<string, unknown>;

    try {
      const sendRequest: INotificationSendRequest = {
        workspaceId: delivery.workspaceId,
        channel: delivery.channel as NotificationProviderChannel,
        recipients: [
          {
            address: delivery.recipientAddress,
            name: delivery.recipientName ?? undefined,
            metadata: meta.recipientMetadata as Record<string, unknown> | undefined,
          },
        ],
        subject: delivery.subject ?? undefined,
        body: meta.body as string | undefined,
        template: meta.template as INotificationSendRequest['template'],
        attachments: meta.attachments as INotificationSendRequest['attachments'],
        idempotencyKey: delivery.idempotencyKey ?? undefined,
        priority: meta.priority as INotificationSendRequest['priority'],
        metadata: {
          ...meta,
          templateSource: (meta.template as { source?: string } | undefined)?.source,
        },
      };

      const result = await this.executor.execute(
        {
          workspaceId: delivery.workspaceId,
          channel: delivery.channel as NotificationProviderChannel,
          preferredProviderKey: meta.preferredProviderKey as string | undefined,
        },
        (criteria) =>
          this.resolveProvider(criteria.workspaceId, criteria.channel, criteria.preferredProviderKey),
        (resolution) => resolution.provider.send(sendRequest),
      );

      const latencyMs = Date.now() - startTime;
      const finalStatus =
        result.status === NotificationDeliveryStatus.DELIVERED
          ? NotificationDeliveryStatus.DELIVERED
          : NotificationDeliveryStatus.SENT;

      const updated = await this.repository.update(delivery.id, {
        status: finalStatus,
        providerKey: result.providerKey,
        providerRef: result.providerRef,
        sentAt: new Date(),
        deliveredAt: finalStatus === NotificationDeliveryStatus.DELIVERED ? new Date() : undefined,
        latencyMs,
      });

      await this.eventQueue.publish({
        event:
          finalStatus === NotificationDeliveryStatus.DELIVERED
            ? NotificationProviderPersistedEvent.DELIVERY_DELIVERED
            : NotificationProviderPersistedEvent.DELIVERY_SENT,
        workspaceId: delivery.workspaceId,
        providerKey: result.providerKey,
        deliveryId: delivery.id,
        batchId: delivery.batchId ?? undefined,
      });

      return { id: updated.id, status: updated.status };
    } catch (error) {
      const errorCode = error instanceof AtlasException ? error.errorCode : 'DELIVERY_FAILED';
      const updated = await this.repository.update(delivery.id, {
        status: NotificationDeliveryStatus.FAILED,
        errorCode,
        errorMessage: (error as Error).message,
        failedAt: new Date(),
        latencyMs: Date.now() - startTime,
      });

      await this.eventQueue.publish({
        event: NotificationProviderPersistedEvent.DELIVERY_FAILED,
        workspaceId: delivery.workspaceId,
        deliveryId: delivery.id,
        batchId: delivery.batchId ?? undefined,
        metadata: { errorCode },
      });

      return { id: updated.id, status: updated.status };
    }
  }

  private async resolveProvider(
    workspaceId: string,
    channel: NotificationProviderChannel,
    preferredProviderKey?: string,
  ): Promise<INotificationExecutionResolution> {
    const candidates = await this.configService.resolveApplicable(
      workspaceId,
      channel,
      preferredProviderKey,
    );

    const config = candidates[0];
    if (!config) {
      throw new NotificationProviderDisabledException(preferredProviderKey ?? channel);
    }

    const provider = this.foundationRegistry.get(config.providerKey);
    const resolvedCredentialFields = await this.credentialService
      .resolveDecrypted(workspaceId, config.providerKey)
      .catch(() => undefined);

    try {
      await provider.initialize({
        providerKey: config.providerKey,
        workspaceId,
        channel,
        enabled: true,
        settings: config.settings as Record<string, unknown>,
        timeoutPolicy: config.timeoutMs ? { requestTimeoutMs: config.timeoutMs } : undefined,
        retryPolicy: config.maxRetryAttempts
          ? {
              maxAttempts: config.maxRetryAttempts,
              backoffMs: config.retryBackoffMs ?? 500,
            }
          : undefined,
        rateLimitPolicy: config.maxRequestsPerMinute
          ? { maxRequestsPerMinute: config.maxRequestsPerMinute }
          : undefined,
        fallbackPolicy: config.fallbackProviderKeys?.length
          ? { fallbackProviderKeys: config.fallbackProviderKeys }
          : undefined,
        resolvedCredentialFields,
      });
    } finally {
      // Decrypted credential material must never outlive this call.
      resolvedCredentialFields && Object.keys(resolvedCredentialFields).forEach((k) => {
        delete resolvedCredentialFields[k];
      });
    }

    return {
      provider,
      providerKey: config.providerKey,
      config: {
        providerKey: config.providerKey,
        workspaceId,
        channel,
        enabled: true,
        timeoutPolicy: config.timeoutMs ? { requestTimeoutMs: config.timeoutMs } : undefined,
        retryPolicy: config.maxRetryAttempts
          ? { maxAttempts: config.maxRetryAttempts, backoffMs: config.retryBackoffMs ?? 500 }
          : undefined,
        rateLimitPolicy: config.maxRequestsPerMinute
          ? { maxRequestsPerMinute: config.maxRequestsPerMinute }
          : undefined,
        fallbackPolicy: config.fallbackProviderKeys?.length
          ? { fallbackProviderKeys: config.fallbackProviderKeys }
          : undefined,
      },
    };
  }

  async processDueScheduled(workspaceId: string): Promise<number> {
    const due = await this.repository.findDueScheduled(workspaceId);
    let processed = 0;

    for (const delivery of due) {
      try {
        await this.dispatch(delivery);
        processed++;
      } catch (error) {
        this.logger.warn(`Failed to process scheduled delivery ${delivery.id}: ${(error as Error).message}`);
      }
    }

    return processed;
  }

  async findById(id: string, workspaceId: string): Promise<INotificationDelivery> {
    const delivery = await this.repository.findById(id, workspaceId);
    if (!delivery) {
      throw new NotificationDeliveryNotFoundException(id);
    }
    return delivery;
  }

  async findAll(filter: DeliveryFilterDto): Promise<PaginatedDeliveryResponseDto> {
    const [data, total] = await this.repository.findAll(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cancel(id: string, workspaceId: string): Promise<INotificationDelivery> {
    const delivery = await this.findById(id, workspaceId);

    if (
      delivery.status !== NotificationDeliveryStatus.PENDING &&
      delivery.status !== NotificationDeliveryStatus.QUEUED
    ) {
      throw new NotificationDeliveryInvalidTransitionException(
        delivery.status,
        NotificationDeliveryStatus.CANCELLED,
      );
    }

    const updated = await this.repository.update(id, {
      status: NotificationDeliveryStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    await this.eventQueue.publish({
      event: NotificationProviderPersistedEvent.DELIVERY_CANCELLED,
      workspaceId,
      deliveryId: id,
    });

    return updated;
  }

  /**
   * Applies an asynchronous delivery-receipt/status-callback update from a
   * provider webhook (e.g. SMS queued→sent→delivered/undelivered/rejected).
   * Looked up by `providerRef` (the vendor's message id returned at send
   * time) rather than by internal delivery id, since the vendor only ever
   * knows its own reference. Returns null (no-op) if no matching delivery
   * is found, rather than throwing — inbound webhooks should still ack 200
   * for unrecognized references instead of retry-looping the vendor.
   */
  async applyStatusCallback(
    workspaceId: string,
    providerRef: string,
    status: NotificationDeliveryStatus,
    options?: { errorCode?: string; errorMessage?: string },
  ): Promise<INotificationDelivery | null> {
    const delivery = await this.repository.findByProviderRef(workspaceId, providerRef);
    if (!delivery) {
      return null;
    }

    const now = new Date();
    const isTerminalFailure = [
      NotificationDeliveryStatus.FAILED,
      NotificationDeliveryStatus.UNDELIVERED,
      NotificationDeliveryStatus.REJECTED,
    ].includes(status);

    const updated = await this.repository.update(delivery.id, {
      status,
      deliveredAt:
        status === NotificationDeliveryStatus.DELIVERED ||
        status === NotificationDeliveryStatus.READ ||
        status === NotificationDeliveryStatus.OPENED
          ? now
          : undefined,
      readAt: status === NotificationDeliveryStatus.READ ? now : undefined,
      openedAt: status === NotificationDeliveryStatus.OPENED ? now : undefined,
      failedAt: isTerminalFailure ? now : undefined,
      cancelledAt: status === NotificationDeliveryStatus.CANCELLED ? now : undefined,
      errorCode: options?.errorCode,
      errorMessage: options?.errorMessage,
    });

    const event = this.eventForStatus(status);
    if (event) {
      await this.eventQueue.publish({
        event,
        workspaceId,
        providerKey: delivery.providerKey ?? undefined,
        deliveryId: delivery.id,
        batchId: delivery.batchId ?? undefined,
      });
    }

    return updated;
  }

  private eventForStatus(
    status: NotificationDeliveryStatus,
  ): NotificationProviderPersistedEvent | undefined {
    switch (status) {
      case NotificationDeliveryStatus.DELIVERED:
        return NotificationProviderPersistedEvent.DELIVERY_DELIVERED;
      case NotificationDeliveryStatus.READ:
        return NotificationProviderPersistedEvent.DELIVERY_READ;
      case NotificationDeliveryStatus.OPENED:
        return NotificationProviderPersistedEvent.DELIVERY_OPENED;
      case NotificationDeliveryStatus.UNDELIVERED:
        return NotificationProviderPersistedEvent.DELIVERY_UNDELIVERED;
      case NotificationDeliveryStatus.REJECTED:
        return NotificationProviderPersistedEvent.DELIVERY_REJECTED;
      case NotificationDeliveryStatus.FAILED:
        return NotificationProviderPersistedEvent.DELIVERY_FAILED;
      case NotificationDeliveryStatus.CANCELLED:
        return NotificationProviderPersistedEvent.DELIVERY_CANCELLED;
      case NotificationDeliveryStatus.SENT:
        return NotificationProviderPersistedEvent.DELIVERY_SENT;
      default:
        return undefined;
    }
  }
}
