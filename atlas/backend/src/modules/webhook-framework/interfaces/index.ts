export enum WebhookScopeType {
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

export enum WebhookEndpointStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum WebhookHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  DEAD_LETTERED = 'DEAD_LETTERED',
  CANCELLED = 'CANCELLED',
}

export enum WebhookChangeType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  SECRET_ROTATED = 'SECRET_ROTATED',
  DELETED = 'DELETED',
}

export enum WebhookFrameworkEvent {
  WEBHOOK_ENDPOINT_CREATED = 'webhook-framework.endpoint_created',
  WEBHOOK_ENDPOINT_UPDATED = 'webhook-framework.endpoint_updated',
  WEBHOOK_ENDPOINT_ENABLED = 'webhook-framework.endpoint_enabled',
  WEBHOOK_ENDPOINT_DISABLED = 'webhook-framework.endpoint_disabled',
  WEBHOOK_ENDPOINT_SECRET_ROTATED = 'webhook-framework.endpoint_secret_rotated',
  WEBHOOK_ENDPOINT_DELETED = 'webhook-framework.endpoint_deleted',
  WEBHOOK_DELIVERY_QUEUED = 'webhook-framework.delivery_queued',
  WEBHOOK_DELIVERY_SUCCEEDED = 'webhook-framework.delivery_succeeded',
  WEBHOOK_DELIVERY_FAILED = 'webhook-framework.delivery_failed',
  WEBHOOK_DELIVERY_DEAD_LETTERED = 'webhook-framework.delivery_dead_lettered',
  WEBHOOK_DELIVERY_CANCELLED = 'webhook-framework.delivery_cancelled',
}

export interface IWebhookEndpoint {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: WebhookScopeType;
  scopeKey: string;
  name: string;
  description: string | null;
  url: string;
  eventTypes: string[];
  headers: Record<string, string> | null;
  payloadVersion: string;
  status: WebhookEndpointStatus;
  healthStatus: WebhookHealthStatus;
  encryptedSecret: string;
  retryMaxAttempts: number;
  retryBackoffMs: number;
  consecutiveFailures: number;
  lastDeliveryAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookDelivery {
  id: string;
  endpointId: string;
  workspaceId: string | null;
  eventType: string;
  eventId: string;
  payloadVersion: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  responseStatus: number | null;
  responseBody: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  nextRetryAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookHistory {
  id: string;
  endpointId: string;
  workspaceId: string | null;
  changeType: WebhookChangeType;
  fromStatus: WebhookEndpointStatus | null;
  toStatus: WebhookEndpointStatus | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

/** Returned once, at creation/rotation time only — never persisted, never returned again. */
export interface IWebhookEndpointCreatedSecret {
  endpoint: IWebhookEndpoint;
  plaintextSecret: string;
}

/** The contract other ATLAS modules call through `WebhookFrameworkService.dispatchEvent()` to fan an internal event out to subscribed endpoints. */
export interface IWebhookEventPublishRequest {
  workspaceId: string;
  organizationId?: string;
  eventType: string;
  /** Caller-supplied source event ID — the idempotency key deliveries dedupe on per endpoint. */
  eventId: string;
  payload: Record<string, unknown>;
  payloadVersion?: string;
}

export interface IWebhookTestResult {
  success: boolean;
  responseStatus?: number;
  latencyMs?: number;
  error?: string;
}

export interface IWebhookFrameworkEventPayload {
  event: WebhookFrameworkEvent;
  endpointId: string;
  workspaceId?: string | null;
  scopeKey?: string;
  deliveryId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
