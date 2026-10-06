import { Injectable } from '@nestjs/common';
import { WebhookRepository } from '../repository/webhook.repository';
import { WebhookStatus, WebhookDeliveryStatus } from '../interfaces';

@Injectable()
export class WebhookStateManager {
  constructor(private readonly repository: WebhookRepository) {}

  async activateWebhook(id: string, workspaceId: string): Promise<void> {
    await this.repository.updateConfig(id, workspaceId, {
      status: WebhookStatus.ACTIVE,
      isActive: true,
    });
  }

  async deactivateWebhook(id: string, workspaceId: string): Promise<void> {
    await this.repository.updateConfig(id, workspaceId, {
      status: WebhookStatus.INACTIVE,
      isActive: false,
    });
  }

  async disableWebhook(id: string, workspaceId: string): Promise<void> {
    await this.repository.updateConfig(id, workspaceId, {
      status: WebhookStatus.DISABLED,
      isActive: false,
    });
  }

  async markWebhookError(id: string, workspaceId: string, errorMessage: string): Promise<void> {
    const config = await this.repository.getConfig(id, workspaceId);
    if (!config) return;

    await this.repository.updateConfig(id, workspaceId, {
      status: WebhookStatus.ERROR,
      failureCount: config.failureCount + 1,
      metadata: {
        ...config.metadata,
        lastError: errorMessage,
        lastErrorAt: new Date(),
      },
    });
  }

  async updateLastDelivery(id: string, workspaceId: string): Promise<void> {
    await this.repository.updateConfig(id, workspaceId, {
      lastDeliveryAt: new Date(),
    });
  }

  async resetFailureCount(id: string, workspaceId: string): Promise<void> {
    await this.repository.updateConfig(id, workspaceId, {
      failureCount: 0,
      status: WebhookStatus.ACTIVE,
    });
  }

  async recordDeliveryAttempt(
    workspaceId: string,
    accountId: string,
    data: {
      webhookConfigId: string;
      externalEventId: string;
      event: any;
      status: WebhookDeliveryStatus;
      payload: Record<string, any>;
      errorMessage?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<any> {
    return this.repository.createDelivery({
      workspaceId,
      accountId,
      webhookConfigId: data.webhookConfigId,
      externalEventId: data.externalEventId,
      event: data.event,
      status: data.status,
      receivedAt: new Date(),
      attemptCount: 1,
      payload: data.payload,
      errorMessage: data.errorMessage,
      metadata: data.metadata,
    });
  }

  async updateDeliveryStatus(
    deliveryId: string,
    workspaceId: string,
    status: WebhookDeliveryStatus,
    errorMessage?: string,
  ): Promise<void> {
    const delivery = await this.repository.getDelivery(deliveryId, workspaceId);
    if (!delivery) return;

    await this.repository.updateDelivery(deliveryId, workspaceId, {
      status,
      processedAt: new Date(),
      attemptCount: delivery.attemptCount + 1,
      errorMessage: errorMessage || delivery.errorMessage,
    });
  }

  async checkDuplicateDelivery(
    workspaceId: string,
    accountId: string,
    externalEventId: string,
  ): Promise<boolean> {
    const existing = await this.repository.getDeliveryByEventId(workspaceId, accountId, externalEventId);
    return !!existing;
  }
}
