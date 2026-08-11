export enum MarketplaceEventType {
  CATALOG_UPDATED = 'CATALOG_UPDATED',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  LISTING_CREATED = 'LISTING_CREATED',
  LISTING_UPDATED = 'LISTING_UPDATED',
  LISTING_DELETED = 'LISTING_DELETED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_UPDATED = 'SHIPMENT_UPDATED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_REJECTED = 'RETURN_REJECTED',
  RETURN_COMPLETED = 'RETURN_COMPLETED',
  PRICE_UPDATED = 'PRICE_UPDATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  REFUND_ISSUED = 'REFUND_ISSUED',
  REPORT_AVAILABLE = 'REPORT_AVAILABLE',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_ACTIVATED = 'ACCOUNT_ACTIVATED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  UNKNOWN = 'UNKNOWN',
}

export enum EventCategory {
  CATALOG = 'CATALOG',
  INVENTORY = 'INVENTORY',
  LISTING = 'LISTING',
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  RETURN = 'RETURN',
  PRICING = 'PRICING',
  PAYMENT = 'PAYMENT',
  REPORT = 'REPORT',
  ACCOUNT = 'ACCOUNT',
  DISPUTE = 'DISPUTE',
  UNKNOWN = 'UNKNOWN',
}

export enum EventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  DUPLICATE = 'DUPLICATE',
  STALE = 'STALE',
}

export enum EventPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum EventLifecycleEvent {
  EVENT_RECEIVED = 'EVENT_RECEIVED',
  EVENT_VALIDATED = 'EVENT_VALIDATED',
  EVENT_CLASSIFIED = 'EVENT_CLASSIFIED',
  EVENT_QUEUED = 'EVENT_QUEUED',
  EVENT_PROCESSING = 'EVENT_PROCESSING',
  EVENT_PROCESSED = 'EVENT_PROCESSED',
  EVENT_FAILED = 'EVENT_FAILED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_DUPLICATE = 'EVENT_DUPLICATE',
  EVENT_STALE = 'EVENT_STALE',
  EVENT_REPROCESSING = 'EVENT_REPROCESSING',
}

export enum EventSource {
  WEBHOOK = 'WEBHOOK',
  POLLING = 'POLLING',
  SYNC = 'SYNC',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
}

export interface IMarketplaceEvent {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalEventId: string;
  eventType: MarketplaceEventType;
  category: EventCategory;
  source: EventSource;
  priority: EventPriority;
  status: EventStatus;
  version?: number;
  occurredAt: Date;
  receivedAt: Date;
  processedAt?: Date;
  attemptCount: number;
  maxAttempts: number;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  errorMessage?: string;
  idempotencyKey?: string;
}

export interface NormalizedMarketplaceEvent {
  externalEventId: string;
  externalEntityId?: string;
  eventType: MarketplaceEventType;
  providerEventType: string;
  occurredAt: Date;
  version?: number;
  payload: Record<string, any>;
  metadata?: {
    source?: string;
    sourceId?: string;
    traceId?: string;
    [key: string]: any;
  };
  rawData: Record<string, any>;
}

export interface EventProcessingResult {
  success: boolean;
  eventId: string;
  entityId?: string;
  action?: string;
  shouldRetry: boolean;
  error?: string;
}

export interface EventProcessingContext {
  eventId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  eventType: MarketplaceEventType;
  category: EventCategory;
  attemptCount: number;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EventProcessor {
  canProcess(eventType: MarketplaceEventType): boolean;
  process(context: EventProcessingContext): Promise<EventProcessingResult>;
}

export interface EventClassificationResult {
  eventType: MarketplaceEventType;
  category: EventCategory;
  priority: EventPriority;
  shouldProcess: boolean;
  reason?: string;
}

export interface EventValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
