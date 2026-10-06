import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { WebhookFrameworkRepository } from './webhook-framework.repository';
import { WebhookCredentialEncryptor } from './webhook-credential.encryptor';
import { WebhookCredentialDecryptor } from './webhook-credential.decryptor';
import { WebhookFrameworkEventQueue } from './jobs/webhook-framework-event.queue';
import { WebhookDeliveryQueue } from './jobs/webhook-delivery.queue';
import { generateWebhookSecret, signWebhookPayload } from './webhook-signing.util';
import { buildWebhookScopeKey } from './scope-key.util';
import { CreateWebhookDto, UpdateWebhookDto, WebhookFilterDto, DeliveryFilterDto, TestWebhookDto, PaginatedWebhookEndpointResponseDto, PaginatedWebhookDeliveryResponseDto } from './dto';
import {
  WebhookChangeType,
  WebhookDeliveryStatus,
  WebhookEndpointStatus,
  WebhookFrameworkEvent,
  WebhookHealthStatus,
  WebhookScopeType,
  IWebhookDelivery,
  IWebhookEndpoint,
  IWebhookEndpointCreatedSecret,
  IWebhookEventPublishRequest,
  IWebhookHistory,
  IWebhookTestResult,
} from './interfaces';
import {
  DEFAULT_RETRY_BACKOFF_MS,
  DEFAULT_RETRY_MAX_ATTEMPTS,
  DELIVERY_REQUEST_TIMEOUT_MS,
  HEALTH_DEGRADED_THRESHOLD,
  HEALTH_UNHEALTHY_THRESHOLD,
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_EVENT_TYPE_HEADER,
  WEBHOOK_FRAMEWORK_MODULE,
  WEBHOOK_MANAGE_ROLES,
  WEBHOOK_PAYLOAD_VERSION,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from './constants';
import {
  WebhookAccessDeniedException,
  WebhookDeliveryAlreadyTerminalException,
  WebhookDeliveryNotFoundException,
  WebhookEndpointAlreadyExistsException,
  WebhookEndpointInvalidDefinitionException,
  WebhookEndpointInvalidUrlException,
  WebhookEndpointNotFoundException,
} from './exceptions/webhook-framework.exceptions';

const ALLOWED_TRANSITIONS: Record<WebhookEndpointStatus, WebhookEndpointStatus[]> = {
  [WebhookEndpointStatus.ACTIVE]: [WebhookEndpointStatus.DISABLED],
  [WebhookEndpointStatus.DISABLED]: [WebhookEndpointStatus.ACTIVE],
};

@Injectable()
export class WebhookFrameworkService {
  private readonly logger = new Logger(WebhookFrameworkService.name);

  constructor(
    private readonly repository: WebhookFrameworkRepository,
    private readonly encryptor: WebhookCredentialEncryptor,
    private readonly decryptor: WebhookCredentialDecryptor,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: WebhookFrameworkEventQueue,
    private readonly deliveryQueue: WebhookDeliveryQueue,
  ) {}

  // ── Create / Update ──────────────────────────────────────────────

  async createWebhook(workspaceId: string, userId: string, userRole: string, dto: CreateWebhookDto): Promise<IWebhookEndpointCreatedSecret> {
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertValidUrl(dto.url);

    const scopeKey = buildWebhookScopeKey({ scopeType: dto.scopeType, workspaceId, organizationId: dto.organizationId });

    const existing = await this.repository.findByScopeKeyAndName(scopeKey, dto.name);
    if (existing) {
      throw new WebhookEndpointAlreadyExistsException(dto.name);
    }

    const plaintextSecret = generateWebhookSecret();
    const encryptedSecret = this.encryptor.encryptSecret(plaintextSecret, scopeKey);

    const endpoint = await this.repository.create({
      workspaceId: dto.scopeType === WebhookScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      name: dto.name,
      description: dto.description ?? null,
      url: dto.url,
      eventTypes: dto.eventTypes,
      headers: (dto.headers ?? null) as any,
      payloadVersion: WEBHOOK_PAYLOAD_VERSION,
      status: WebhookEndpointStatus.ACTIVE,
      healthStatus: WebhookHealthStatus.HEALTHY,
      encryptedSecret,
      retryMaxAttempts: dto.retryMaxAttempts ?? DEFAULT_RETRY_MAX_ATTEMPTS,
      retryBackoffMs: dto.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS,
      consecutiveFailures: 0,
      createdBy: userId,
    });

    await this.repository.createHistory({
      endpointId: endpoint.id,
      workspaceId: endpoint.workspaceId,
      changeType: WebhookChangeType.CREATED,
      toStatus: WebhookEndpointStatus.ACTIVE,
      changedBy: userId,
      snapshot: this.sanitizeForHistory(endpoint),
    });

    await this.recordAudit(workspaceId, userId, 'webhook-framework.endpoint.created', AuditActionCategory.CREATE, endpoint.id);
    await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_ENDPOINT_CREATED, endpoint, undefined, undefined, userId);

    return { endpoint, plaintextSecret };
  }

  async updateWebhook(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateWebhookDto): Promise<IWebhookEndpoint> {
    const endpoint = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (dto.url) {
      this.assertValidUrl(dto.url);
    }

    const updated = await this.repository.update(id, {
      name: dto.name ?? endpoint.name,
      description: dto.description ?? endpoint.description,
      url: dto.url ?? endpoint.url,
      eventTypes: dto.eventTypes ?? endpoint.eventTypes,
      headers: (dto.headers ?? endpoint.headers) as any,
      retryMaxAttempts: dto.retryMaxAttempts ?? endpoint.retryMaxAttempts,
      retryBackoffMs: dto.retryBackoffMs ?? endpoint.retryBackoffMs,
    });

    await this.repository.createHistory({
      endpointId: id,
      workspaceId: endpoint.workspaceId,
      changeType: WebhookChangeType.UPDATED,
      changedBy: userId,
      snapshot: this.sanitizeForHistory(updated),
    });

    await this.recordAudit(workspaceId, userId, 'webhook-framework.endpoint.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_ENDPOINT_UPDATED, updated, undefined, undefined, userId);
    return updated;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async enableWebhook(id: string, workspaceId: string, userId: string, userRole: string): Promise<IWebhookEndpoint> {
    const endpoint = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transition(endpoint, WebhookEndpointStatus.ACTIVE, userId, WebhookChangeType.ENABLED, WebhookFrameworkEvent.WEBHOOK_ENDPOINT_ENABLED);
  }

  async disableWebhook(id: string, workspaceId: string, userId: string, userRole: string): Promise<IWebhookEndpoint> {
    const endpoint = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transition(endpoint, WebhookEndpointStatus.DISABLED, userId, WebhookChangeType.DISABLED, WebhookFrameworkEvent.WEBHOOK_ENDPOINT_DISABLED);
  }

  async rotateSecret(id: string, workspaceId: string, userId: string, userRole: string): Promise<IWebhookEndpointCreatedSecret> {
    const endpoint = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const plaintextSecret = generateWebhookSecret();
    const encryptedSecret = this.encryptor.encryptSecret(plaintextSecret, endpoint.scopeKey);
    const updated = await this.repository.update(id, { encryptedSecret });

    await this.repository.createHistory({
      endpointId: id,
      workspaceId: endpoint.workspaceId,
      changeType: WebhookChangeType.SECRET_ROTATED,
      changedBy: userId,
      snapshot: this.sanitizeForHistory(updated),
    });

    await this.recordAudit(workspaceId, userId, 'webhook-framework.endpoint.secret_rotated', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_ENDPOINT_SECRET_ROTATED, updated, undefined, undefined, userId);

    return { endpoint: updated, plaintextSecret };
  }

  /** Hard delete. History is intentionally NOT written for this transition — `onDelete: Cascade` would erase that very row along with its parent. The durable trail is `AuditLogsService`, whose table is independent. */
  async deleteWebhook(id: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    const endpoint = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    await this.recordAudit(workspaceId, userId, 'webhook-framework.endpoint.deleted', AuditActionCategory.DELETE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_ENDPOINT_DELETED, endpoint, undefined, undefined, userId);
    await this.repository.delete(id);
  }

  // ── Test ─────────────────────────────────────────────────────────

  /** Sends a synthetic test payload immediately, bypassing the queue/retry path — also the mechanism for verifying endpoint ownership/activation before relying on live delivery. Never throws; failures are reported in the result. */
  async testWebhook(id: string, workspaceId: string, dto: TestWebhookDto): Promise<IWebhookTestResult> {
    const endpoint = await this.getVisibleOrThrow(id, workspaceId);
    const secret = this.decryptor.decryptSecret(endpoint.encryptedSecret, endpoint.scopeKey);
    const eventType = dto.eventType ?? 'webhook.test';
    const eventId = `test_${Date.now()}`;

    const rawBody = JSON.stringify({
      id: eventId,
      type: eventType,
      apiVersion: endpoint.payloadVersion,
      createdAt: new Date().toISOString(),
      data: dto.payload ?? { message: 'This is a test event from ATLAS Webhook Framework' },
    });

    const startedAt = Date.now();
    try {
      const response = await this.sendHttp(endpoint, rawBody, eventId, eventType);
      const latencyMs = Date.now() - startedAt;
      const success = response.status >= 200 && response.status < 300;
      return {
        success,
        responseStatus: response.status,
        latencyMs,
        error: success ? undefined : `Endpoint responded with status ${response.status}`,
      };
    } catch (error) {
      return { success: false, latencyMs: Date.now() - startedAt, error: (error as Error).message };
    }
  }

  // ── Dispatch (the entry point other ATLAS modules call) ───────────

  /** Fans a source event out to every ACTIVE endpoint subscribed to `eventType`, queuing one delivery per endpoint. Re-dispatching the same `eventId` to an endpoint that already has a delivery queued is an idempotent no-op, not an error. */
  async dispatchEvent(request: IWebhookEventPublishRequest): Promise<{ queued: number; skipped: number }> {
    const endpoints = await this.repository.findActiveSubscribedEndpoints(request.workspaceId, request.organizationId, request.eventType);

    let queued = 0;
    let skipped = 0;

    for (const endpoint of endpoints) {
      const existing = await this.repository.findDeliveryByIdempotencyKey(endpoint.id, request.eventId);
      if (existing) {
        skipped++;
        continue;
      }

      let delivery: IWebhookDelivery;
      try {
        delivery = await this.repository.createDelivery({
          endpointId: endpoint.id,
          workspaceId: endpoint.workspaceId,
          eventType: request.eventType,
          eventId: request.eventId,
          payloadVersion: request.payloadVersion ?? WEBHOOK_PAYLOAD_VERSION,
          payload: request.payload as any,
          status: WebhookDeliveryStatus.PENDING,
          maxAttempts: endpoint.retryMaxAttempts,
          idempotencyKey: request.eventId,
        });
      } catch (error) {
        if (this.isUniqueConstraintViolation(error)) {
          skipped++;
          continue;
        }
        throw error;
      }

      await this.deliveryQueue.enqueue(delivery.id, endpoint.retryMaxAttempts, endpoint.retryBackoffMs);
      await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_QUEUED, endpoint, delivery.id);
      queued++;
    }

    return { queued, skipped };
  }

  // ── Delivery processing (called by WebhookDeliveryWorker) ─────────

  async attemptDelivery(deliveryId: string, attemptNumber: number): Promise<void> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery) {
      this.logger.warn(`Delivery '${deliveryId}' no longer exists — skipping`);
      return;
    }
    if (delivery.status === WebhookDeliveryStatus.CANCELLED) {
      this.logger.debug(`Delivery '${deliveryId}' was cancelled — skipping`);
      return;
    }

    const endpoint = await this.repository.findById(delivery.endpointId);
    if (!endpoint || endpoint.status !== WebhookEndpointStatus.ACTIVE) {
      await this.repository.updateDelivery(deliveryId, {
        status: WebhookDeliveryStatus.FAILED,
        attemptCount: attemptNumber,
        errorMessage: 'Endpoint is inactive or no longer exists',
      });
      return;
    }

    const rawBody = JSON.stringify({
      id: delivery.eventId,
      type: delivery.eventType,
      apiVersion: delivery.payloadVersion,
      createdAt: delivery.createdAt.toISOString(),
      data: delivery.payload,
    });

    const startedAt = Date.now();
    try {
      const response = await this.sendHttp(endpoint, rawBody, delivery.eventId, delivery.eventType);
      const latencyMs = Date.now() - startedAt;
      const succeeded = response.status >= 200 && response.status < 300;

      await this.repository.updateDelivery(deliveryId, {
        attemptCount: attemptNumber,
        status: succeeded ? WebhookDeliveryStatus.SUCCEEDED : WebhookDeliveryStatus.RETRYING,
        responseStatus: response.status,
        responseBody: this.truncateResponseBody(response.data),
        latencyMs,
        deliveredAt: succeeded ? new Date() : null,
        errorMessage: succeeded ? null : `Endpoint responded with status ${response.status}`,
      });

      await this.updateEndpointHealth(endpoint, succeeded);

      if (succeeded) {
        await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_SUCCEEDED, endpoint, deliveryId);
        return;
      }

      await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_FAILED, endpoint, deliveryId, { responseStatus: response.status, attemptNumber });
      throw new Error(`Endpoint responded with status ${response.status}`);
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = axios.isAxiosError(error) ? error.message : (error as Error).message;

      await this.repository.updateDelivery(deliveryId, {
        attemptCount: attemptNumber,
        status: WebhookDeliveryStatus.RETRYING,
        latencyMs,
        errorMessage: message,
      });
      await this.updateEndpointHealth(endpoint, false);
      await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_FAILED, endpoint, deliveryId, { error: message, attemptNumber });

      // Rethrow so BullMQ applies backoff and retries, or exhausts attempts — `WebhookDeliveryWorker`'s `failed` handler dead-letters on exhaustion.
      throw error;
    }
  }

  /** Called by `WebhookDeliveryWorker`'s `failed` event handler once BullMQ has exhausted all attempts for a delivery. */
  async markDeadLettered(deliveryId: string, reason: string): Promise<void> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery || delivery.status === WebhookDeliveryStatus.CANCELLED || delivery.status === WebhookDeliveryStatus.SUCCEEDED) {
      return;
    }

    await this.repository.updateDelivery(deliveryId, { status: WebhookDeliveryStatus.DEAD_LETTERED, errorMessage: reason });

    const endpoint = await this.repository.findById(delivery.endpointId);
    if (endpoint) {
      await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_DEAD_LETTERED, endpoint, deliveryId, { reason });
    }

    this.logger.warn(`Delivery '${deliveryId}' dead-lettered after exhausting retries: ${reason}`);
  }

  // ── Manual delivery controls ───────────────────────────────────────

  async redeliverDelivery(deliveryId: string, workspaceId: string, userId: string, userRole: string): Promise<IWebhookDelivery> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new WebhookDeliveryNotFoundException(deliveryId);
    }

    const endpoint = await this.getVisibleOrThrow(delivery.endpointId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const redelivery = await this.repository.createDelivery({
      endpointId: endpoint.id,
      workspaceId: endpoint.workspaceId,
      eventType: delivery.eventType,
      eventId: delivery.eventId,
      payloadVersion: delivery.payloadVersion,
      payload: delivery.payload as any,
      status: WebhookDeliveryStatus.PENDING,
      maxAttempts: endpoint.retryMaxAttempts,
      idempotencyKey: `${delivery.idempotencyKey}:redelivery:${Date.now()}`,
    });

    await this.deliveryQueue.enqueue(redelivery.id, endpoint.retryMaxAttempts, endpoint.retryBackoffMs);
    await this.recordAudit(workspaceId, userId, 'webhook-framework.delivery.redelivered', AuditActionCategory.OTHER, redelivery.id);
    await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_QUEUED, endpoint, redelivery.id, { redeliveredFrom: delivery.id }, userId);

    return redelivery;
  }

  async cancelDelivery(deliveryId: string, workspaceId: string, userId: string, userRole: string): Promise<IWebhookDelivery> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new WebhookDeliveryNotFoundException(deliveryId);
    }

    const endpoint = await this.getVisibleOrThrow(delivery.endpointId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const terminalStates: string[] = [WebhookDeliveryStatus.SUCCEEDED, WebhookDeliveryStatus.DEAD_LETTERED, WebhookDeliveryStatus.CANCELLED];
    if (terminalStates.includes(delivery.status)) {
      throw new WebhookDeliveryAlreadyTerminalException(delivery.status);
    }

    await this.deliveryQueue.cancel(delivery.id);
    const updated = await this.repository.updateDelivery(delivery.id, { status: WebhookDeliveryStatus.CANCELLED, cancelledAt: new Date() });

    await this.recordAudit(workspaceId, userId, 'webhook-framework.delivery.cancelled', AuditActionCategory.UPDATE, delivery.id);
    await this.publishEvent(WebhookFrameworkEvent.WEBHOOK_DELIVERY_CANCELLED, endpoint, delivery.id, undefined, userId);

    return updated;
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getWebhook(id: string, workspaceId: string): Promise<IWebhookEndpoint> {
    return this.getVisibleOrThrow(id, workspaceId);
  }

  async getHistory(id: string, workspaceId: string): Promise<IWebhookHistory[]> {
    await this.getVisibleOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllWebhooks(workspaceId: string, filter: WebhookFilterDto): Promise<PaginatedWebhookEndpointResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDeliveries(id: string, workspaceId: string, filter: DeliveryFilterDto): Promise<PaginatedWebhookDeliveryResponseDto> {
    await this.getVisibleOrThrow(id, workspaceId);
    const [data, total] = await this.repository.findDeliveriesForEndpoint(id, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async sendHttp(endpoint: IWebhookEndpoint, rawBody: string, eventId: string, eventType: string) {
    const secret = this.decryptor.decryptSecret(endpoint.encryptedSecret, endpoint.scopeKey);
    const timestamp = Date.now();
    const { signature } = signWebhookPayload(rawBody, secret, timestamp);

    return axios.post(endpoint.url, rawBody, {
      timeout: DELIVERY_REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        [WEBHOOK_SIGNATURE_HEADER]: `t=${timestamp},v1=${signature}`,
        [WEBHOOK_TIMESTAMP_HEADER]: String(timestamp),
        [WEBHOOK_EVENT_ID_HEADER]: eventId,
        [WEBHOOK_EVENT_TYPE_HEADER]: eventType,
        ...(endpoint.headers ?? {}),
      },
      validateStatus: () => true,
    });
  }

  private async updateEndpointHealth(endpoint: IWebhookEndpoint, succeeded: boolean): Promise<void> {
    const now = new Date();
    const consecutiveFailures = succeeded ? 0 : endpoint.consecutiveFailures + 1;
    const healthStatus = succeeded
      ? WebhookHealthStatus.HEALTHY
      : consecutiveFailures >= HEALTH_UNHEALTHY_THRESHOLD
        ? WebhookHealthStatus.UNHEALTHY
        : consecutiveFailures >= HEALTH_DEGRADED_THRESHOLD
          ? WebhookHealthStatus.DEGRADED
          : endpoint.healthStatus;

    await this.repository.update(endpoint.id, {
      consecutiveFailures,
      healthStatus,
      lastDeliveryAt: now,
      lastSuccessAt: succeeded ? now : endpoint.lastSuccessAt,
      lastFailureAt: succeeded ? endpoint.lastFailureAt : now,
    });
  }

  private async transition(
    endpoint: IWebhookEndpoint,
    to: WebhookEndpointStatus,
    userId: string,
    changeType: WebhookChangeType,
    event: WebhookFrameworkEvent,
  ): Promise<IWebhookEndpoint> {
    if (!ALLOWED_TRANSITIONS[endpoint.status]?.includes(to)) {
      throw new WebhookEndpointInvalidDefinitionException(`Cannot transition webhook endpoint from '${endpoint.status}' to '${to}'`);
    }

    const updated = await this.repository.update(endpoint.id, { status: to });

    await this.repository.createHistory({
      endpointId: endpoint.id,
      workspaceId: endpoint.workspaceId,
      changeType,
      fromStatus: endpoint.status,
      toStatus: to,
      changedBy: userId,
      snapshot: this.sanitizeForHistory(updated),
    });

    await this.recordAudit(
      endpoint.workspaceId ?? endpoint.organizationId ?? 'unknown',
      userId,
      `webhook-framework.endpoint.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      endpoint.id,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, updated, undefined, undefined, userId);
    return updated;
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (WEBHOOK_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new WebhookAccessDeniedException();
    }
  }

  private async getVisibleOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<IWebhookEndpoint> {
    const endpoint = await this.repository.findById(id);
    const visible = !!endpoint && (endpoint.workspaceId === workspaceId || (!!organizationId && endpoint.organizationId === organizationId));
    if (!endpoint || !visible) {
      throw new WebhookEndpointNotFoundException(id);
    }
    return endpoint;
  }

  private assertValidUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new WebhookEndpointInvalidUrlException(url);
    }
  }

  private truncateResponseBody(body: unknown): string {
    const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
    return text.length > 4000 ? `${text.slice(0, 4000)}…(truncated)` : text;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
  }

  /** Snapshots never include `encryptedSecret` — history is inspectable by workspace admins and must never leak secret material either. */
  private sanitizeForHistory(endpoint: IWebhookEndpoint): Record<string, unknown> {
    const { encryptedSecret: _encryptedSecret, ...safe } = endpoint;
    return safe;
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
    riskLevel?: AuditRiskLevel,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: WEBHOOK_FRAMEWORK_MODULE,
      entityType: 'WebhookEndpoint',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(
    event: WebhookFrameworkEvent,
    endpoint: IWebhookEndpoint,
    deliveryId?: string,
    metadata?: Record<string, unknown>,
    actorId?: string,
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      endpointId: endpoint.id,
      workspaceId: endpoint.workspaceId,
      scopeKey: endpoint.scopeKey,
      deliveryId,
      actorId,
      metadata,
    });
  }
}
