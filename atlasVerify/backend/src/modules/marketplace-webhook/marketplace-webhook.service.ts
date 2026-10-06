import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderFactory } from '../marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceCapability } from '../marketplace-provider/interfaces/marketplace-provider.interface';
import { WebhookRepository } from './repository/webhook.repository';
import { WebhookValidator } from './validator/webhook.validator';
import { WebhookStateManager } from './state/webhook-state.manager';
import { WebhookEventQueue } from './events/webhook-events.queue';
import { WebhookHandler } from './handler/webhook-handler';
import { WebhookMetrics } from './metrics/webhook.metrics';
import {
  RegisterWebhookRequestDto,
  UpdateWebhookRequestDto,
  WebhookConfigFilterQueryDto,
  WebhookDeliveryFilterQueryDto,
  IncomingWebhookDto,
} from './dto';
import { WebhookLifecycleEvent, WebhookStatus } from './interfaces';

@Injectable()
export class MarketplaceWebhookService {
  constructor(
    private readonly providerFactory: MarketplaceProviderFactory,
    private readonly repository: WebhookRepository,
    private readonly validator: WebhookValidator,
    private readonly stateManager: WebhookStateManager,
    private readonly eventQueue: WebhookEventQueue,
    private readonly handler: WebhookHandler,
    private readonly metrics: WebhookMetrics,
  ) {}

  async register(dto: RegisterWebhookRequestDto) {
    this.validator.validateRegistrationRequest(dto);

    const provider = await this.providerFactory.getProvider(dto.providerKey, dto.marketplaceKey);
    if (!provider.hasCapability(MarketplaceCapability.WEBHOOKS)) {
      throw new BadRequestException(
        `Provider ${dto.providerKey}/${dto.marketplaceKey} does not support webhooks`,
      );
    }

    const adapter = provider.getWebhookAdapter();
    
    const result = await adapter.registerWebhook({
      accountId: dto.accountId,
      callbackUrl: dto.callbackUrl,
      events: dto.events,
      metadata: dto.metadata,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to register webhook: ${result.error}`);
    }

    const config = await this.repository.createConfig({
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      providerKey: dto.providerKey,
      marketplaceKey: dto.marketplaceKey,
      externalWebhookId: result.externalWebhookId,
      callbackUrl: dto.callbackUrl,
      events: dto.events,
      status: WebhookStatus.ACTIVE,
      secret: result.secret,
      isActive: true,
      metadata: dto.metadata,
    });

    if (result.secret) {
      await this.repository.storeSecret({
        workspaceId: dto.workspaceId,
        webhookConfigId: config.id,
        secret: result.secret,
        isActive: true,
      });
    }

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.WEBHOOK_REGISTERED,
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      webhookConfigId: config.id,
      data: { externalWebhookId: result.externalWebhookId },
    });

    return config;
  }

  async update(webhookId: string, workspaceId: string, dto: UpdateWebhookRequestDto) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }

    const provider = await this.providerFactory.getProvider(config.providerKey, config.marketplaceKey);
    const adapter = provider.getWebhookAdapter();

    const result = await adapter.updateWebhook({
      accountId: config.accountId,
      externalWebhookId: config.externalWebhookId,
      callbackUrl: dto.callbackUrl,
      events: dto.events,
      metadata: dto.metadata,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to update webhook: ${result.error}`);
    }

    const updated = await this.repository.updateConfig(webhookId, workspaceId, {
      ...(dto.callbackUrl && { callbackUrl: dto.callbackUrl }),
      ...(dto.events && { events: dto.events }),
      ...(dto.metadata && { metadata: { ...config.metadata, ...dto.metadata } }),
    });

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.WEBHOOK_UPDATED,
      workspaceId,
      accountId: config.accountId,
      webhookConfigId: webhookId,
    });

    return updated;
  }

  async enable(webhookId: string, workspaceId: string) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }

    const provider = await this.providerFactory.getProvider(config.providerKey, config.marketplaceKey);
    const adapter = provider.getWebhookAdapter();

    const result = await adapter.enableWebhook({
      accountId: config.accountId,
      externalWebhookId: config.externalWebhookId,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to enable webhook: ${result.error}`);
    }

    await this.stateManager.activateWebhook(webhookId, workspaceId);

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.WEBHOOK_ENABLED,
      workspaceId,
      accountId: config.accountId,
      webhookConfigId: webhookId,
    });

    return this.repository.getConfig(webhookId, workspaceId);
  }

  async disable(webhookId: string, workspaceId: string) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }

    const provider = await this.providerFactory.getProvider(config.providerKey, config.marketplaceKey);
    const adapter = provider.getWebhookAdapter();

    const result = await adapter.disableWebhook({
      accountId: config.accountId,
      externalWebhookId: config.externalWebhookId,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to disable webhook: ${result.error}`);
    }

    await this.stateManager.disableWebhook(webhookId, workspaceId);

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.WEBHOOK_DISABLED,
      workspaceId,
      accountId: config.accountId,
      webhookConfigId: webhookId,
    });

    return this.repository.getConfig(webhookId, workspaceId);
  }

  async delete(webhookId: string, workspaceId: string) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }

    const provider = await this.providerFactory.getProvider(config.providerKey, config.marketplaceKey);
    const adapter = provider.getWebhookAdapter();

    const result = await adapter.deleteWebhook({
      accountId: config.accountId,
      externalWebhookId: config.externalWebhookId,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to delete webhook: ${result.error}`);
    }

    await this.repository.deleteConfig(webhookId, workspaceId);

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.WEBHOOK_DELETED,
      workspaceId,
      accountId: config.accountId,
      webhookConfigId: webhookId,
    });
  }

  async rotateSecret(webhookId: string, workspaceId: string) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }

    const provider = await this.providerFactory.getProvider(config.providerKey, config.marketplaceKey);
    const adapter = provider.getWebhookAdapter();

    const result = await adapter.rotateSecret({
      accountId: config.accountId,
      externalWebhookId: config.externalWebhookId,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to rotate secret: ${result.error}`);
    }

    await this.repository.deactivateSecrets(workspaceId, webhookId);
    
    await this.repository.storeSecret({
      workspaceId,
      webhookConfigId: webhookId,
      secret: result.newSecret,
      isActive: true,
    });

    await this.repository.updateConfig(webhookId, workspaceId, {
      secret: result.newSecret,
    });

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.SECRET_ROTATED,
      workspaceId,
      accountId: config.accountId,
      webhookConfigId: webhookId,
    });

    return { secret: result.newSecret, rotatedAt: new Date() };
  }

  async handleIncoming(dto: IncomingWebhookDto, rawBody: string | Buffer) {
    const provider = await this.providerFactory.getProvider(dto.providerKey, dto.marketplaceKey);
    const adapter = provider.getWebhookAdapter();

    return this.handler.handleIncoming({
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      providerKey: dto.providerKey,
      marketplaceKey: dto.marketplaceKey,
      headers: dto.headers,
      body: dto.body,
      rawBody,
      adapter,
    });
  }

  async findConfigs(filter: WebhookConfigFilterQueryDto) {
    return this.repository.findConfigs(filter as any);
  }

  async getConfig(webhookId: string, workspaceId: string) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }
    return config;
  }

  async findDeliveries(workspaceId: string, accountId: string, filter: WebhookDeliveryFilterQueryDto) {
    return this.repository.findDeliveries({
      workspaceId,
      accountId,
      ...filter,
    } as any);
  }

  async getDelivery(deliveryId: string, workspaceId: string) {
    const delivery = await this.repository.getDelivery(deliveryId, workspaceId);
    if (!delivery) {
      throw new NotFoundException('Webhook delivery not found');
    }
    return delivery;
  }

  async getMetrics(workspaceId: string, accountId?: string) {
    return this.metrics.getMetrics(workspaceId, accountId);
  }
}
