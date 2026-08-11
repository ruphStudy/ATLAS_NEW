import { WebhookDeliveryStatus, WebhookEndpointStatus, WebhookHealthStatus, WebhookScopeType } from '../interfaces';

/** Never includes `encryptedSecret` or the plaintext secret — safe metadata only. */
export class WebhookEndpointResponseDto {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: WebhookScopeType;
  name: string;
  description: string | null;
  url: string;
  eventTypes: string[];
  headers: Record<string, string> | null;
  payloadVersion: string;
  status: WebhookEndpointStatus;
  healthStatus: WebhookHealthStatus;
  retryMaxAttempts: number;
  retryBackoffMs: number;
  consecutiveFailures: number;
  lastDeliveryAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedWebhookEndpointResponseDto {
  data: WebhookEndpointResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Returned once — the only response shape that ever carries the plaintext signing secret. */
export class WebhookEndpointCreatedResponseDto {
  endpoint: WebhookEndpointResponseDto;
  plaintextSecret: string;
}

export class WebhookHistoryResponseDto {
  id: string;
  endpointId: string;
  changeType: string;
  fromStatus: WebhookEndpointStatus | null;
  toStatus: WebhookEndpointStatus | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class WebhookDeliveryResponseDto {
  id: string;
  endpointId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedWebhookDeliveryResponseDto {
  data: WebhookDeliveryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class WebhookTestResultResponseDto {
  success: boolean;
  responseStatus?: number;
  latencyMs?: number;
  error?: string;
}
