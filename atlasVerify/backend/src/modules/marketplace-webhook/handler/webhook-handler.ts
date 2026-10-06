import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebhookRepository } from '../repository/webhook.repository';
import { WebhookValidator } from '../validator/webhook.validator';
import { WebhookStateManager } from '../state/webhook-state.manager';
import { WebhookEventQueue } from '../events/webhook-events.queue';
import { WebhookProcessingQueue } from '../queue/webhook-processing.queue';
import { WebhookMapper } from '../mapper/webhook-mapper';
import { WebhookSignatureVerifier } from '../signature/webhook-signature-verifier';
import {
  NormalizedWebhookPayload,
  WebhookLifecycleEvent,
  WebhookDeliveryStatus,
  WebhookAdapter,
} from '../interfaces';

@Injectable()
export class WebhookHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  constructor(
    private readonly repository: WebhookRepository,
    private readonly validator: WebhookValidator,
    private readonly stateManager: WebhookStateManager,
    private readonly eventQueue: WebhookEventQueue,
    private readonly processingQueue: WebhookProcessingQueue,
    private readonly mapper: WebhookMapper,
    private readonly signatureVerifier: WebhookSignatureVerifier,
  ) {}

  async handleIncoming(params: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    headers: Record<string, string>;
    body: any;
    rawBody: string | Buffer;
    adapter: WebhookAdapter;
  }): Promise<{ accepted: boolean; deliveryId?: string; reason?: string }> {
    try {
      // Validate payload size
      this.validator.validatePayloadSize(params.body);

      // Normalize webhook payload
      const normalized = params.adapter.normalizePayload({
        headers: params.headers,
        body: params.body,
      });

      // Find webhook configuration
      const config = await this.repository.getConfigByExternalId(
        params.workspaceId,
        params.accountId,
        normalized.externalWebhookId,
      );

      if (!config) {
        this.logger.warn(`No webhook configuration found for ${normalized.externalWebhookId}`);
        return { accepted: false, reason: 'Webhook not registered' };
      }

      if (!config.isActive) {
        this.logger.warn(`Webhook ${config.id} is not active`);
        return { accepted: false, reason: 'Webhook is not active' };
      }

      // Verify signature if secret exists
      if (config.secret && normalized.signature) {
        const verification = this.signatureVerifier.verify({
          adapter: params.adapter,
          payload: params.rawBody,
          signature: normalized.signature,
          secret: config.secret,
          timestamp: normalized.timestamp?.toISOString(),
        });

        if (!verification.valid) {
          this.logger.error(`Signature verification failed: ${verification.reason}`);
          throw new UnauthorizedException('Invalid webhook signature');
        }
      }

      // Validate webhook payload
      this.validator.validateIncomingWebhook(normalized);

      // Check for duplicate
      const isDuplicate = await this.stateManager.checkDuplicateDelivery(
        params.workspaceId,
        params.accountId,
        normalized.externalEventId,
      );

      if (isDuplicate) {
        this.logger.warn(`Duplicate webhook event: ${normalized.externalEventId}`);
        await this.eventQueue.publish({
          event: WebhookLifecycleEvent.WEBHOOK_DUPLICATE,
          workspaceId: params.workspaceId,
          accountId: params.accountId,
          webhookConfigId: config.id,
          data: { externalEventId: normalized.externalEventId },
        });
        return { accepted: false, reason: 'Duplicate event' };
      }

      // Record delivery attempt
      const delivery = await this.stateManager.recordDeliveryAttempt(params.workspaceId, params.accountId, {
        webhookConfigId: config.id,
        externalEventId: normalized.externalEventId,
        event: normalized.event,
        status: WebhookDeliveryStatus.PENDING,
        payload: normalized.payload,
        metadata: {
          headers: normalized.headers,
          providerEvent: normalized.providerEvent,
        },
      });

      // Publish received event
      await this.eventQueue.publish({
        event: WebhookLifecycleEvent.WEBHOOK_RECEIVED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        webhookConfigId: config.id,
        deliveryId: delivery.id,
        data: {
          event: normalized.event,
          externalEventId: normalized.externalEventId,
        },
      });

      // Enqueue for processing
      await this.processingQueue.enqueue({
        deliveryId: delivery.id,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        webhookConfigId: config.id,
        payload: normalized as NormalizedWebhookPayload,
        attemptCount: 1,
      });

      // Update webhook last delivery time
      await this.stateManager.updateLastDelivery(config.id, params.workspaceId);

      return { accepted: true, deliveryId: delivery.id };
    } catch (error) {
      this.logger.error(`Failed to handle incoming webhook: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException) {
        return { accepted: false, reason: error.message };
      }

      await this.eventQueue.publish({
        event: WebhookLifecycleEvent.WEBHOOK_REJECTED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        data: { error: error.message },
      });

      return { accepted: false, reason: 'Internal error processing webhook' };
    }
  }

  async processDelivery(params: {
    deliveryId: string;
    workspaceId: string;
    accountId: string;
    webhookConfigId: string;
    payload: NormalizedWebhookPayload;
  }): Promise<void> {
    try {
      // Update delivery status to processing
      await this.stateManager.updateDeliveryStatus(
        params.deliveryId,
        params.workspaceId,
        WebhookDeliveryStatus.PROCESSING,
      );

      // Process based on event type
      await this.processEventType(params.payload);

      // Update delivery status to success
      await this.stateManager.updateDeliveryStatus(
        params.deliveryId,
        params.workspaceId,
        WebhookDeliveryStatus.SUCCESS,
      );

      // Reset failure count on success
      await this.stateManager.resetFailureCount(params.webhookConfigId, params.workspaceId);

      // Publish processed event
      await this.eventQueue.publish({
        event: WebhookLifecycleEvent.WEBHOOK_PROCESSED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        webhookConfigId: params.webhookConfigId,
        deliveryId: params.deliveryId,
        data: { event: params.payload.event },
      });
    } catch (error) {
      this.logger.error(`Failed to process webhook delivery ${params.deliveryId}: ${error.message}`);

      // Update delivery status to failed
      await this.stateManager.updateDeliveryStatus(
        params.deliveryId,
        params.workspaceId,
        WebhookDeliveryStatus.FAILED,
        error.message,
      );

      // Mark webhook as error
      await this.stateManager.markWebhookError(params.webhookConfigId, params.workspaceId, error.message);

      // Publish failed event
      await this.eventQueue.publish({
        event: WebhookLifecycleEvent.WEBHOOK_FAILED,
        workspaceId: params.workspaceId,
        accountId: params.accountId,
        webhookConfigId: params.webhookConfigId,
        deliveryId: params.deliveryId,
        data: { error: error.message, event: params.payload.event },
      });

      throw error;
    }
  }

  private async processEventType(payload: NormalizedWebhookPayload): Promise<void> {
    // Placeholder for actual event processing logic
    // This would typically delegate to specific handlers based on event type
    this.logger.log(`Processing webhook event: ${payload.event} [${payload.externalEventId}]`);
  }
}
