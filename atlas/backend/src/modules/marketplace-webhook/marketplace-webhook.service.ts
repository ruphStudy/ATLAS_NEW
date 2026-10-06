import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AdapterRegistry } from '../marketplace-adapter/registry/adapter.registry';
import { AdapterFactory } from '../marketplace-adapter/factory/adapter.factory';
import {
  AdapterCapability,
  AdapterOperation,
  IAdapter,
  IAdapterResponse,
  IRequestContext,
} from '../marketplace-adapter/interfaces';
import { MarketplaceProviderService } from '../marketplace-provider/marketplace-provider.service';
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
    private readonly adapterRegistry: AdapterRegistry,
    private readonly adapterFactory: AdapterFactory,
    private readonly providerService: MarketplaceProviderService,
    private readonly repository: WebhookRepository,
    private readonly validator: WebhookValidator,
    private readonly stateManager: WebhookStateManager,
    private readonly eventQueue: WebhookEventQueue,
    private readonly handler: WebhookHandler,
    private readonly metrics: WebhookMetrics,
  ) {}

  async register(dto: RegisterWebhookRequestDto) {
    this.validator.validateRegistrationRequest(dto);

    const adapter = await this.resolveWebhookAdapter(dto.workspaceId, dto.providerKey, dto.accountId);
    const secret = this.generateWebhookSecret();

    const result = await adapter.registerWebhook(
      this.buildContext(dto.workspaceId, dto.providerKey, dto.accountId, AdapterOperation.REGISTER_WEBHOOK),
      { url: dto.callbackUrl, events: dto.events, secret },
    );

    if (!result.success) {
      throw new BadRequestException(`Failed to register webhook: ${result.error?.message ?? 'unknown error'}`);
    }

    const externalWebhookId = this.extractExternalWebhookId(result);

    const config = await this.repository.createConfig({
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      providerKey: dto.providerKey,
      marketplaceKey: dto.marketplaceKey,
      externalWebhookId,
      callbackUrl: dto.callbackUrl,
      events: dto.events,
      status: WebhookStatus.ACTIVE,
      secret,
      isActive: true,
      metadata: dto.metadata,
    });

    await this.repository.storeSecret({
      workspaceId: dto.workspaceId,
      webhookConfigId: config.id,
      secret,
      isActive: true,
    });

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.WEBHOOK_REGISTERED,
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      webhookConfigId: config.id,
      data: { externalWebhookId },
    });

    return config;
  }

  async update(webhookId: string, workspaceId: string, dto: UpdateWebhookRequestDto) {
    const config = await this.repository.getConfig(webhookId, workspaceId);
    if (!config) {
      throw new NotFoundException('Webhook configuration not found');
    }

    const adapter = await this.resolveWebhookAdapter(workspaceId, config.providerKey, config.accountId);

    // No partial-update primitive exists on the real adapter contract — an
    // update is a re-registration: drop the old external subscription (if
    // any) and create a new one with the updated url/events, keeping the
    // existing signing secret unchanged.
    if (config.externalWebhookId) {
      await adapter.unregisterWebhook(
        this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.UNREGISTER_WEBHOOK),
        config.externalWebhookId,
      );
    }

    const result = await adapter.registerWebhook(
      this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.REGISTER_WEBHOOK),
      {
        url: dto.callbackUrl ?? config.callbackUrl,
        events: dto.events ?? config.events,
        secret: config.secret,
      },
    );

    if (!result.success) {
      throw new BadRequestException(`Failed to update webhook: ${result.error?.message ?? 'unknown error'}`);
    }

    const externalWebhookId = this.extractExternalWebhookId(result) ?? config.externalWebhookId;

    const updated = await this.repository.updateConfig(webhookId, workspaceId, {
      externalWebhookId,
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

    const adapter = await this.resolveWebhookAdapter(workspaceId, config.providerKey, config.accountId);

    // No enable/disable primitive exists — enabling re-subscribes the
    // provider-side webhook using the stored url/events/secret.
    const result = await adapter.registerWebhook(
      this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.REGISTER_WEBHOOK),
      { url: config.callbackUrl, events: config.events, secret: config.secret },
    );

    if (!result.success) {
      throw new BadRequestException(`Failed to enable webhook: ${result.error?.message ?? 'unknown error'}`);
    }

    const externalWebhookId = this.extractExternalWebhookId(result) ?? config.externalWebhookId;
    await this.repository.updateConfig(webhookId, workspaceId, { externalWebhookId });

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

    const adapter = await this.resolveWebhookAdapter(workspaceId, config.providerKey, config.accountId);

    // Disabling unsubscribes the provider-side webhook so no further
    // events are sent while it's off.
    if (config.externalWebhookId) {
      const result = await adapter.unregisterWebhook(
        this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.UNREGISTER_WEBHOOK),
        config.externalWebhookId,
      );
      if (!result.success) {
        throw new BadRequestException(`Failed to disable webhook: ${result.error?.message ?? 'unknown error'}`);
      }
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

    const adapter = await this.resolveWebhookAdapter(workspaceId, config.providerKey, config.accountId);

    if (config.externalWebhookId) {
      const result = await adapter.unregisterWebhook(
        this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.UNREGISTER_WEBHOOK),
        config.externalWebhookId,
      );
      if (!result.success) {
        throw new BadRequestException(`Failed to delete webhook: ${result.error?.message ?? 'unknown error'}`);
      }
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

    const adapter = await this.resolveWebhookAdapter(workspaceId, config.providerKey, config.accountId);
    const newSecret = this.generateWebhookSecret();

    // The signing secret is ours, not the provider's — rotation means
    // re-registering the same subscription so future payloads are signed
    // with the new secret.
    if (config.externalWebhookId) {
      await adapter.unregisterWebhook(
        this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.UNREGISTER_WEBHOOK),
        config.externalWebhookId,
      );
    }

    const result = await adapter.registerWebhook(
      this.buildContext(workspaceId, config.providerKey, config.accountId, AdapterOperation.REGISTER_WEBHOOK),
      { url: config.callbackUrl, events: config.events, secret: newSecret },
    );

    if (!result.success) {
      throw new BadRequestException(`Failed to rotate secret: ${result.error?.message ?? 'unknown error'}`);
    }

    const externalWebhookId = this.extractExternalWebhookId(result) ?? config.externalWebhookId;

    await this.repository.deactivateSecrets(workspaceId, webhookId);

    await this.repository.storeSecret({
      workspaceId,
      webhookConfigId: webhookId,
      secret: newSecret,
      isActive: true,
    });

    await this.repository.updateConfig(webhookId, workspaceId, {
      secret: newSecret,
      externalWebhookId,
    });

    await this.eventQueue.publish({
      event: WebhookLifecycleEvent.SECRET_ROTATED,
      workspaceId,
      accountId: config.accountId,
      webhookConfigId: webhookId,
    });

    return { secret: newSecret, rotatedAt: new Date() };
  }

  async handleIncoming(dto: IncomingWebhookDto, rawBody: string | Buffer) {
    // Signature verification and payload normalization are provider-agnostic
    // (HMAC + generic field extraction) — no adapter resolution needed.
    return this.handler.handleIncoming({
      workspaceId: dto.workspaceId,
      accountId: dto.accountId,
      providerKey: dto.providerKey,
      marketplaceKey: dto.marketplaceKey,
      headers: dto.headers,
      body: dto.body,
      rawBody,
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

  // ── Adapter Resolution ────────────────────────────────────────

  /**
   * Resolves a real, credential-initialized adapter for a provider account
   * via the marketplace-adapter registry/factory (the current adapter
   * architecture) instead of the legacy provider-factory API. Reuses
   * MarketplaceProviderService's existing credential decryption — no
   * second credential mechanism.
   */
  private async resolveWebhookAdapter(
    workspaceId: string,
    providerKey: string,
    accountId: string,
  ): Promise<IAdapter> {
    if (!this.adapterRegistry.has(providerKey)) {
      throw new BadRequestException(`Provider '${providerKey}' is not registered`);
    }

    const credentials = await this.providerService.resolveDecryptedCredentials(
      workspaceId,
      providerKey,
      accountId,
    );
    if (!credentials) {
      throw new BadRequestException(`No credentials configured for provider '${providerKey}'`);
    }

    const adapter = await this.adapterFactory.create(
      providerKey,
      { workspaceId, provider: providerKey, accountId },
      {
        workspaceId,
        provider: providerKey,
        accountId,
        credentialType: credentials.credentialType,
        credentials: credentials.fields,
        expiresAt: credentials.expiresAt ?? undefined,
      },
    );

    const { supportedCapabilities } = adapter.getCapabilities();
    if (!supportedCapabilities.includes(AdapterCapability.WEBHOOK_MANAGEMENT)) {
      throw new BadRequestException(`Provider '${providerKey}' does not support webhooks`);
    }

    return adapter;
  }

  private buildContext(
    workspaceId: string,
    providerKey: string,
    accountId: string,
    operation: AdapterOperation,
  ): IRequestContext {
    return {
      workspaceId,
      provider: providerKey,
      accountId,
      operation,
      requestId: uuidv4(),
    };
  }

  /** Provider webhook-registration payloads are not normalized across
   * adapters, so the id is read defensively from the common key names. */
  private extractExternalWebhookId(result: IAdapterResponse): string | undefined {
    const data = result.data as Record<string, unknown> | undefined;
    const candidate =
      data?.['id'] ?? data?.['webhookId'] ?? data?.['webhook_id'] ?? data?.['subscriptionId'];
    return typeof candidate === 'string' ? candidate : (result.metadata?.requestId as string | undefined);
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
