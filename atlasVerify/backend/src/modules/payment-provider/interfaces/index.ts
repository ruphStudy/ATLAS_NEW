export enum PaymentProviderAccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  SUSPENDED = 'SUSPENDED',
}

export enum PaymentHealthState {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  OFFLINE = 'OFFLINE',
}

export enum PaymentConnectionStatus {
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export enum PaymentTransactionType {
  PAYMENT = 'PAYMENT',
  AUTHORIZATION = 'AUTHORIZATION',
  CAPTURE = 'CAPTURE',
  REFUND = 'REFUND',
  CANCELLATION = 'CANCELLATION',
}

export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentWebhookStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/** Open vocabulary — new capabilities never require touching the adapter contract, only an adapter's own `metadata.supportedCapabilities`. */
export enum PaymentCapability {
  PAYMENT = 'PAYMENT',
  AUTHORIZATION = 'AUTHORIZATION',
  CAPTURE = 'CAPTURE',
  CANCELLATION = 'CANCELLATION',
  REFUND = 'REFUND',
  RECURRING = 'RECURRING',
  WEBHOOK = 'WEBHOOK',
}

export enum PaymentProviderEvent {
  ACCOUNT_REGISTERED = 'payment-provider.account_registered',
  ACCOUNT_UPDATED = 'payment-provider.account_updated',
  CREDENTIALS_CONFIGURED = 'payment-provider.credentials_configured',
  CONNECTION_TEST_SUCCEEDED = 'payment-provider.connection_test_succeeded',
  CONNECTION_TEST_FAILED = 'payment-provider.connection_test_failed',
  HEALTH_STATE_CHANGED = 'payment-provider.health_state_changed',
  TRANSACTION_CREATED = 'payment-provider.transaction_created',
  TRANSACTION_SUCCEEDED = 'payment-provider.transaction_succeeded',
  TRANSACTION_FAILED = 'payment-provider.transaction_failed',
  TRANSACTION_REFUNDED = 'payment-provider.transaction_refunded',
  WEBHOOK_RECEIVED = 'payment-provider.webhook_received',
  WEBHOOK_PROCESSED = 'payment-provider.webhook_processed',
}

// ── Adapter-facing models ────────────────────────────────────────────

export interface IPaymentProviderMetadata {
  providerKey: string;
  displayName: string;
  supportedCapabilities: PaymentCapability[];
  /** Empty = all countries/currencies supported. */
  supportedCountries: string[];
  supportedCurrencies: string[];
  /** The credential field keys this adapter expects (e.g. `['secretKey', 'webhookSecret']`) — documentation only, never enforced beyond `validateCredentials`. */
  requiredCredentialFields: string[];
}

export interface IPaymentCustomer {
  externalCustomerId?: string;
  email?: string;
  name?: string;
}

/** Never raw card data — `token` is always a provider-issued token/payment-method-id. */
export interface IPaymentMethodInput {
  type: string;
  token?: string;
}

export interface ICreatePaymentRequest {
  amount: number;
  currency: string;
  idempotencyKey: string;
  customer?: IPaymentCustomer;
  paymentMethod?: IPaymentMethodInput;
  description?: string;
  metadata?: Record<string, unknown>;
  /** true = capture immediately; false = authorize only, capture later. */
  capture?: boolean;
}

export interface IRefundRequest {
  externalTransactionId: string;
  /** Omit for a full refund. */
  amount?: number;
  reason?: string;
  idempotencyKey: string;
}

/** Only safe, normalized fields — an adapter must never place raw secrets/tokens/card data into `raw`. */
export interface IPaymentResult {
  externalTransactionId: string;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  capturedAmount?: number;
  refundedAmount?: number;
  raw?: Record<string, unknown>;
}

export interface IPaymentHealthResult {
  providerKey: string;
  accountId?: string;
  state: PaymentHealthState;
  connectionStatus: PaymentConnectionStatus;
  responseTimeMs?: number;
  errorMessage?: string;
  checkedAt: Date;
}

export interface ICredentialValidationResult {
  valid: boolean;
  message?: string;
}

export interface INormalizedWebhookEvent {
  providerKey: string;
  externalEventId: string;
  eventType: string;
  externalTransactionId?: string;
  /** Only safe, normalized fields extracted from the provider payload. */
  payload: Record<string, unknown>;
}

/**
 * Contract every concrete provider adapter (Stripe, Razorpay, future
 * providers) must implement. All provider-specific HTTP/auth/signature
 * logic stays inside the adapter — the registry, factory, health,
 * connection-test and webhook services only ever call through this
 * interface, mirroring `IMarketplaceProviderAdapter`'s shape.
 */
export interface IPaymentProviderAdapter {
  readonly metadata: IPaymentProviderMetadata;

  supportsCapability(capability: PaymentCapability): boolean;
  supportsCountry(country: string): boolean;
  supportsCurrency(currency: string): boolean;

  validateCredentials(fields: Record<string, string>): Promise<ICredentialValidationResult>;
  testConnection(fields: Record<string, string>): Promise<IPaymentHealthResult>;
  healthCheck(fields: Record<string, string>): Promise<IPaymentHealthResult>;

  createPayment(request: ICreatePaymentRequest, credentials: Record<string, string>): Promise<IPaymentResult>;
  capturePayment(externalTransactionId: string, amount: number | undefined, credentials: Record<string, string>): Promise<IPaymentResult>;
  cancelPayment(externalTransactionId: string, credentials: Record<string, string>): Promise<IPaymentResult>;
  refundPayment(request: IRefundRequest, credentials: Record<string, string>): Promise<IPaymentResult>;
  getPaymentStatus(externalTransactionId: string, credentials: Record<string, string>): Promise<IPaymentResult>;

  verifyWebhookSignature(headers: Record<string, string>, rawBody: string, webhookSecret: string): boolean;
  normalizeWebhookPayload(headers: Record<string, string>, rawBody: string): INormalizedWebhookEvent;
}

// ── Persistence-facing models ────────────────────────────────────────

export interface IPaymentProviderAccount {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  providerKey: string;
  accountHandle: string;
  displayName: string | null;
  country: string | null;
  currency: string | null;
  status: PaymentProviderAccountStatus;
  priority: number;
  isDefault: boolean;
  capabilities: string[];
  supportedCountries: string[];
  supportedCurrencies: string[];
  healthState: PaymentHealthState;
  consecutiveFailures: number;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  lastTestCorrelationId: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IPaymentProviderCredential {
  id: string;
  accountId: string;
  workspaceId: string;
  providerKey: string;
  encryptedFields: Record<string, string>;
  encryptionVersion: string;
  status: string;
  lastValidatedAt: Date | null;
  lastRotatedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Ephemeral — decrypted credential values must never be persisted or logged. */
export interface IDecryptedCredentialBag {
  accountId: string;
  workspaceId: string;
  providerKey: string;
  fields: Record<string, string>;
}

export interface IPaymentTransaction {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  invoiceId: string | null;
  billingPeriodId: string | null;
  subscriptionId: string | null;
  type: PaymentTransactionType;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  capturedAmount: number | null;
  refundedAmount: number;
  externalTransactionId: string | null;
  externalReference: Record<string, unknown> | null;
  idempotencyKey: string | null;
  parentTransactionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  requestedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentWebhookEvent {
  id: string;
  workspaceId: string | null;
  accountId: string | null;
  providerKey: string;
  externalEventId: string;
  eventType: string;
  status: PaymentWebhookStatus;
  signatureValid: boolean;
  payload: Record<string, unknown>;
  failureReason: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface IPaymentProviderHealthHistory {
  id: string;
  accountId: string;
  workspaceId: string;
  fromState: PaymentHealthState | null;
  toState: PaymentHealthState;
  connectionStatus: PaymentConnectionStatus;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: Date;
}

export interface IConnectionTestResult {
  correlationId: string;
  workspaceId: string;
  providerKey: string;
  accountId: string;
  success: boolean;
  connectionStatus: PaymentConnectionStatus;
  responseTimeMs: number;
  errorMessage?: string;
  testedAt: Date;
}

export interface INormalizedPaymentError {
  code: string;
  message: string;
  providerKey: string;
  httpStatus?: number;
  retryable: boolean;
}

/** Options used by the registry/factory to select the best-matching adapter+account for a request. */
export interface IProviderResolutionOptions {
  workspaceId: string;
  capability: PaymentCapability;
  country?: string;
  currency?: string;
  preferredAccountId?: string;
}

export interface IResolvedPaymentProvider {
  adapter: IPaymentProviderAdapter;
  account: IPaymentProviderAccount;
}

export interface IPaymentProviderEventPayload {
  event: PaymentProviderEvent;
  workspaceId: string;
  providerKey: string;
  accountId?: string;
  transactionId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
