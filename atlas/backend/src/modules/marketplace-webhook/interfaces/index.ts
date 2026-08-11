export enum WebhookEvent {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  LISTING_CREATED = 'LISTING_CREATED',
  LISTING_UPDATED = 'LISTING_UPDATED',
  LISTING_DELETED = 'LISTING_DELETED',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  PRICE_UPDATED = 'PRICE_UPDATED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_REJECTED = 'RETURN_REJECTED',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
  CUSTOM = 'CUSTOM',
}

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISABLED = 'DISABLED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED',
}

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  DUPLICATE = 'DUPLICATE',
}

export enum WebhookLifecycleEvent {
  WEBHOOK_REGISTERED = 'WEBHOOK_REGISTERED',
  WEBHOOK_UPDATED = 'WEBHOOK_UPDATED',
  WEBHOOK_ENABLED = 'WEBHOOK_ENABLED',
  WEBHOOK_DISABLED = 'WEBHOOK_DISABLED',
  WEBHOOK_DELETED = 'WEBHOOK_DELETED',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_VALIDATED = 'WEBHOOK_VALIDATED',
  WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',
  WEBHOOK_REJECTED = 'WEBHOOK_REJECTED',
  WEBHOOK_DUPLICATE = 'WEBHOOK_DUPLICATE',
  SECRET_ROTATED = 'SECRET_ROTATED',
}

export interface IWebhookConfig {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalWebhookId?: string;
  callbackUrl: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret?: string;
  isActive: boolean;
  lastDeliveryAt?: Date;
  failureCount: number;
  metadata?: Record<string, any>;
}

export interface NormalizedWebhookPayload {
  externalWebhookId: string;
  externalEventId: string;
  event: WebhookEvent;
  timestamp: Date;
  providerEvent: string;
  signature?: string;
  payload: Record<string, any>;
  headers: Record<string, string>;
  metadata?: {
    attempt?: number;
    retryable?: boolean;
    [key: string]: any;
  };
  rawData: Record<string, any>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
  errors?: string[];
}

export interface WebhookProcessingResult {
  success: boolean;
  eventType: WebhookEvent;
  entityId?: string;
  error?: string;
  shouldRetry: boolean;
}

export interface WebhookAdapter {
  registerWebhook(params: {
    accountId: string;
    callbackUrl: string;
    events: WebhookEvent[];
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    externalWebhookId: string;
    secret?: string;
    error?: string;
  }>;

  updateWebhook(params: {
    accountId: string;
    externalWebhookId: string;
    callbackUrl?: string;
    events?: WebhookEvent[];
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  deleteWebhook(params: {
    accountId: string;
    externalWebhookId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  enableWebhook(params: {
    accountId: string;
    externalWebhookId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  disableWebhook(params: {
    accountId: string;
    externalWebhookId: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  verifySignature(params: {
    payload: string | Buffer;
    signature: string;
    secret: string;
    timestamp?: string;
  }): boolean;

  normalizePayload(params: {
    headers: Record<string, string>;
    body: any;
  }): NormalizedWebhookPayload;

  rotateSecret(params: {
    accountId: string;
    externalWebhookId: string;
  }): Promise<{
    success: boolean;
    newSecret?: string;
    error?: string;
  }>;
}

export interface WebhookDeliveryRecord {
  id: string;
  workspaceId: string;
  accountId: string;
  webhookConfigId: string;
  externalEventId: string;
  event: WebhookEvent;
  status: WebhookDeliveryStatus;
  receivedAt: Date;
  processedAt?: Date;
  attemptCount: number;
  errorMessage?: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}
