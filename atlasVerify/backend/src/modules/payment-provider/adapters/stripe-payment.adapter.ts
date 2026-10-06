import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { providerHttpRequest } from '../provider-http.util';
import { PAYMENT_PROVIDER_KEYS } from '../constants';
import {
  ICreatePaymentRequest,
  ICredentialValidationResult,
  INormalizedWebhookEvent,
  IPaymentCustomer,
  IPaymentHealthResult,
  IPaymentProviderAdapter,
  IPaymentProviderMetadata,
  IPaymentResult,
  IRefundRequest,
  PaymentCapability,
  PaymentConnectionStatus,
  PaymentHealthState,
  PaymentTransactionStatus,
} from '../interfaces';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/** Stripe uses the smallest currency unit (cents) for most currencies — this is the common-case conversion; zero-decimal currencies (e.g. JPY) are out of scope for this adapter's simple 2-decimal assumption. */
function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}

function fromStripeAmount(amount: number): number {
  return Math.round(amount) / 100;
}

function toFormBody(fields: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) params.append(key, String(value));
  }
  return params.toString();
}

/** PaymentIntent status → our normalized transaction status. */
const STRIPE_PAYMENT_INTENT_STATUS_MAP: Record<string, PaymentTransactionStatus> = {
  requires_payment_method: PaymentTransactionStatus.PENDING,
  requires_confirmation: PaymentTransactionStatus.PENDING,
  requires_action: PaymentTransactionStatus.PROCESSING,
  processing: PaymentTransactionStatus.PROCESSING,
  requires_capture: PaymentTransactionStatus.AUTHORIZED,
  succeeded: PaymentTransactionStatus.SUCCEEDED,
  canceled: PaymentTransactionStatus.CANCELLED,
};

/** Refund status → our normalized transaction status. */
const STRIPE_REFUND_STATUS_MAP: Record<string, PaymentTransactionStatus> = {
  pending: PaymentTransactionStatus.PROCESSING,
  succeeded: PaymentTransactionStatus.REFUNDED,
  failed: PaymentTransactionStatus.FAILED,
  canceled: PaymentTransactionStatus.CANCELLED,
};

/** Webhook `type` → the raw status string the generic `PaymentWebhookService` maps to a transaction status — kept within that shared vocabulary (succeeded/captured/authorized/failed/refunded/cancelled) so no framework change is needed for Stripe's event naming. */
const STRIPE_WEBHOOK_EVENT_TO_STATUS: Record<string, string> = {
  'payment_intent.succeeded': 'succeeded',
  'payment_intent.payment_failed': 'failed',
  'payment_intent.canceled': 'cancelled',
  'payment_intent.amount_capturable_updated': 'authorized',
  'charge.refunded': 'refunded',
  'charge.refund.updated': 'refunded',
  'invoice.paid': 'succeeded',
  'invoice.payment_failed': 'failed',
};

interface IStripeObject {
  id?: string;
  object?: string;
  status?: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  latest_charge?: string | { id?: string };
  payment_intent?: string | { id?: string };
  subscription?: string | { id?: string };
  customer?: string | { id?: string };
  invoice?: string | { id?: string };
  [key: string]: unknown;
}

/**
 * All Stripe-specific request shapes, authentication, ID mapping and error
 * parsing live here — nothing outside this file knows Stripe's API exists.
 * One-time charges use PaymentIntents directly; recurring flows create (or
 * reuse) a Customer and a Subscription, surfacing the first invoice's
 * PaymentIntent as the canonical transaction reference so
 * capture/cancel/refund/status-lookup keep working the same way regardless
 * of which path created the transaction.
 */
@Injectable()
export class StripePaymentAdapter implements IPaymentProviderAdapter {
  private readonly logger = new Logger(StripePaymentAdapter.name);

  readonly metadata: IPaymentProviderMetadata = {
    providerKey: PAYMENT_PROVIDER_KEYS.STRIPE,
    displayName: 'Stripe',
    supportedCapabilities: [
      PaymentCapability.PAYMENT,
      PaymentCapability.AUTHORIZATION,
      PaymentCapability.CAPTURE,
      PaymentCapability.CANCELLATION,
      PaymentCapability.REFUND,
      PaymentCapability.RECURRING,
      PaymentCapability.WEBHOOK,
    ],
    supportedCountries: [],
    supportedCurrencies: [],
    requiredCredentialFields: ['secretKey', 'webhookSecret'],
  };

  supportsCapability(capability: PaymentCapability): boolean {
    return this.metadata.supportedCapabilities.includes(capability);
  }

  supportsCountry(country: string): boolean {
    return this.metadata.supportedCountries.length === 0 || this.metadata.supportedCountries.includes(country);
  }

  supportsCurrency(currency: string): boolean {
    return this.metadata.supportedCurrencies.length === 0 || this.metadata.supportedCurrencies.includes(currency);
  }

  // ── Authentication & account validation ───────────────────────────

  async validateCredentials(fields: Record<string, string>): Promise<ICredentialValidationResult> {
    if (!fields.secretKey) {
      return { valid: false, message: 'secretKey is required' };
    }

    const traceId = this.newTraceId();
    const response = await this.request('GET', '/balance', fields, undefined, traceId).catch((error) => {
      this.logger.warn(`Stripe credential validation request failed [${traceId}]: ${(error as Error).message}`);
      return null;
    });

    if (!response) {
      return { valid: false, message: 'Could not reach Stripe to validate credentials' };
    }
    if (!response.ok) {
      return { valid: false, message: this.extractErrorMessage(response.json) };
    }
    if (!fields.webhookSecret) {
      return { valid: true, message: 'Key is valid, but no webhookSecret was provided — inbound webhooks will fail signature verification' };
    }
    return { valid: true };
  }

  async testConnection(fields: Record<string, string>): Promise<IPaymentHealthResult> {
    return this.probe(fields);
  }

  async healthCheck(fields: Record<string, string>): Promise<IPaymentHealthResult> {
    return this.probe(fields);
  }

  // ── Payments ─────────────────────────────────────────────────────

  async createPayment(request: ICreatePaymentRequest, credentials: Record<string, string>): Promise<IPaymentResult> {
    const recurringPriceId = request.metadata?.recurringPriceId as string | undefined;
    if (recurringPriceId) {
      return this.createSubscription(request, recurringPriceId, credentials);
    }

    const traceId = this.newTraceId();
    const customerId = await this.resolveOrCreateCustomer(request.customer, credentials, traceId);
    const finalBody = toFormBody({
      amount: toStripeAmount(request.amount),
      currency: request.currency.toLowerCase(),
      description: request.description,
      capture_method: request.capture === false ? 'manual' : 'automatic',
      payment_method: request.paymentMethod?.token,
      confirm: request.paymentMethod?.token ? true : undefined,
      customer: customerId,
      'metadata[idempotencyKey]': request.idempotencyKey,
    });

    const response = await this.request('POST', '/payment_intents', credentials, finalBody, traceId, request.idempotencyKey);
    return this.toPaymentResult(response.json, response.ok, traceId);
  }

  /** Creates (or reuses) a Customer, then a Subscription for `priceId`, expanding the first invoice's PaymentIntent so the result stays consistent with the one-time-payment shape. */
  private async createSubscription(request: ICreatePaymentRequest, priceId: string, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const customerId = await this.resolveOrCreateCustomer(request.customer, credentials, traceId);
    if (!customerId) {
      return { externalTransactionId: '', status: PaymentTransactionStatus.FAILED, amount: 0, currency: request.currency, raw: { traceId, error: 'A customer (email or externalCustomerId) is required to create a Stripe subscription' } };
    }

    const body = toFormBody({
      customer: customerId,
      'items[0][price]': priceId,
      payment_behavior: 'default_incomplete',
      'expand[0]': 'latest_invoice.payment_intent',
      'metadata[idempotencyKey]': request.idempotencyKey,
    });

    const response = await this.request('POST', '/subscriptions', credentials, body, traceId, request.idempotencyKey);
    if (!response.ok) {
      return { externalTransactionId: '', status: PaymentTransactionStatus.FAILED, amount: 0, currency: request.currency, raw: this.safeRaw(response.json, traceId) };
    }

    const subscriptionId = String(response.json.id ?? '');
    const latestInvoice = response.json.latest_invoice as IStripeObject | string | undefined;
    const invoice = typeof latestInvoice === 'object' ? latestInvoice : undefined;
    const paymentIntent = invoice?.payment_intent as IStripeObject | string | undefined;
    const pi = typeof paymentIntent === 'object' ? paymentIntent : undefined;

    if (pi?.id) {
      const status = STRIPE_PAYMENT_INTENT_STATUS_MAP[String(pi.status)] ?? PaymentTransactionStatus.PENDING;
      return {
        externalTransactionId: pi.id,
        status,
        amount: fromStripeAmount(Number(pi.amount ?? 0)),
        currency: String(pi.currency ?? request.currency).toUpperCase(),
        raw: this.safeRaw({ ...pi, subscriptionId, invoiceId: invoice?.id, customerId }, traceId),
      };
    }

    // Trial-only or zero-amount-due subscriptions have no immediate PaymentIntent — the subscription id becomes the canonical reference until the first real invoice arrives (via webhook).
    return {
      externalTransactionId: subscriptionId,
      status: PaymentTransactionStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      raw: this.safeRaw({ id: subscriptionId, subscriptionId, customerId, status: response.json.status }, traceId),
    };
  }

  async capturePayment(externalTransactionId: string, amount: number | undefined, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const body = toFormBody({ amount_to_capture: amount !== undefined ? toStripeAmount(amount) : undefined });
    const response = await this.request('POST', `/payment_intents/${externalTransactionId}/capture`, credentials, body, traceId, `capture:${externalTransactionId}`);
    return this.toPaymentResult(response.json, response.ok, traceId);
  }

  async cancelPayment(externalTransactionId: string, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const response = await this.request('POST', `/payment_intents/${externalTransactionId}/cancel`, credentials, undefined, traceId, `cancel:${externalTransactionId}`);
    return this.toPaymentResult(response.json, response.ok, traceId);
  }

  async refundPayment(request: IRefundRequest, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const body = toFormBody({
      payment_intent: request.externalTransactionId,
      amount: request.amount !== undefined ? toStripeAmount(request.amount) : undefined,
      reason: request.reason,
    });

    const response = await this.request('POST', '/refunds', credentials, body, traceId, request.idempotencyKey);

    if (!response.ok) {
      return { externalTransactionId: request.externalTransactionId, status: PaymentTransactionStatus.FAILED, amount: 0, currency: '', raw: this.safeRaw(response.json, traceId) };
    }

    return {
      externalTransactionId: request.externalTransactionId,
      status: STRIPE_REFUND_STATUS_MAP[String(response.json.status)] ?? PaymentTransactionStatus.PROCESSING,
      amount: fromStripeAmount(Number(response.json.amount ?? 0)),
      currency: String(response.json.currency ?? '').toUpperCase(),
      refundedAmount: fromStripeAmount(Number(response.json.amount ?? 0)),
      raw: this.safeRaw({ ...response.json, refundId: response.json.id, paymentIntentId: request.externalTransactionId }, traceId),
    };
  }

  async getPaymentStatus(externalTransactionId: string, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const response = await this.request('GET', `/payment_intents/${externalTransactionId}`, credentials, undefined, traceId);
    return this.toPaymentResult(response.json, response.ok, traceId);
  }

  // ── Webhooks ─────────────────────────────────────────────────────

  /** `Stripe-Signature: t=<timestamp>,v1=<hex hmac of "timestamp.rawBody">` — constant-time compared, never logged. */
  verifyWebhookSignature(headers: Record<string, string>, rawBody: string, webhookSecret: string): boolean {
    const signatureHeader = headers['stripe-signature'] ?? headers['Stripe-Signature'];
    if (!signatureHeader) return false;

    const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=') as [string, string]));
    const timestamp = parts.t;
    const providedSignature = parts.v1;
    if (!timestamp || !providedSignature) return false;

    const expected = createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedSignature, 'hex'));
    } catch {
      return false;
    }
  }

  normalizeWebhookPayload(_headers: Record<string, string>, rawBody: string): INormalizedWebhookEvent {
    const parsed = JSON.parse(rawBody) as { id?: string; type?: string; data?: { object?: IStripeObject } };
    const object = parsed.data?.object ?? {};
    const eventType = parsed.type ?? 'unknown';
    const status = STRIPE_WEBHOOK_EVENT_TO_STATUS[eventType];

    // A PaymentIntent event carries its own id; a charge/refund event references its parent via `payment_intent`; an invoice event references it the same way. Payouts (Stripe's settlement analog) have no payment_intent link — they're recorded for tracking only.
    const paymentIntentRef = object.payment_intent;
    const externalTransactionId =
      object.object === 'payment_intent'
        ? object.id
        : typeof paymentIntentRef === 'string'
          ? paymentIntentRef
          : paymentIntentRef?.id;

    return {
      providerKey: this.metadata.providerKey,
      externalEventId: parsed.id ?? '',
      eventType,
      externalTransactionId,
      payload: {
        status,
        amount: object.amount !== undefined ? fromStripeAmount(Number(object.amount)) : undefined,
        currency: object.currency,
        chargeId: this.extractId(object.latest_charge),
        subscriptionId: this.extractId(object.subscription),
        invoiceId: object.object === 'invoice' ? object.id : this.extractId(object.invoice),
        customerId: this.extractId(object.customer),
        payoutId: object.object === 'payout' ? object.id : undefined,
      },
    };
  }

  // ── Private ──────────────────────────────────────────────────────

  private authHeaders(secretKey: string): Record<string, string> {
    return { Authorization: `Bearer ${secretKey}` };
  }

  private newTraceId(): string {
    return randomUUID();
  }

  /** Generic request helper — logs only the trace id/method/path, never headers/body (which may carry `secretKey`-derived auth, tokens or customer PII). */
  private async request(
    method: 'GET' | 'POST',
    path: string,
    credentials: Record<string, string>,
    body: string | undefined,
    traceId?: string,
    idempotencyKey?: string,
  ) {
    const trace = traceId ?? this.newTraceId();
    this.logger.debug(`Stripe ${method} ${path} [trace=${trace}]`);

    return providerHttpRequest({
      url: `${STRIPE_API_BASE}${path}`,
      method,
      headers: {
        ...this.authHeaders(credentials.secretKey),
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Atlas-Trace-Id': trace,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body,
    });
  }

  /** Reuses `customer.externalCustomerId` if it already holds a Stripe customer id; otherwise creates a new Stripe Customer from the supplied email/name. Returns `undefined` for guest checkouts with no customer reference at all. */
  private async resolveOrCreateCustomer(customer: IPaymentCustomer | undefined, credentials: Record<string, string>, traceId: string): Promise<string | undefined> {
    if (!customer) return undefined;
    if (customer.externalCustomerId) return customer.externalCustomerId;
    if (!customer.email) return undefined;

    const response = await this.request(
      'POST',
      '/customers',
      credentials,
      toFormBody({ email: customer.email, name: customer.name }),
      traceId,
    );
    return response.ok ? String(response.json.id ?? '') || undefined : undefined;
  }

  private async probe(fields: Record<string, string>): Promise<IPaymentHealthResult> {
    const startedAt = Date.now();
    const traceId = this.newTraceId();
    try {
      const response = await this.request('GET', '/balance', fields, undefined, traceId);
      const responseTimeMs = Date.now() - startedAt;
      return {
        providerKey: this.metadata.providerKey,
        state: response.ok ? PaymentHealthState.HEALTHY : PaymentHealthState.UNHEALTHY,
        connectionStatus: response.ok ? PaymentConnectionStatus.CONNECTED : PaymentConnectionStatus.FAILED,
        responseTimeMs,
        errorMessage: response.ok ? undefined : this.extractErrorMessage(response.json),
        checkedAt: new Date(),
      };
    } catch (error) {
      return {
        providerKey: this.metadata.providerKey,
        state: PaymentHealthState.OFFLINE,
        connectionStatus: (error as Error).name === 'AbortError' ? PaymentConnectionStatus.TIMEOUT : PaymentConnectionStatus.FAILED,
        errorMessage: (error as Error).message,
        checkedAt: new Date(),
      };
    }
  }

  private toPaymentResult(json: Record<string, unknown>, ok: boolean, traceId: string): IPaymentResult {
    if (!ok) {
      return { externalTransactionId: String(json.id ?? ''), status: PaymentTransactionStatus.FAILED, amount: 0, currency: '', raw: this.safeRaw(json, traceId) };
    }

    const status = STRIPE_PAYMENT_INTENT_STATUS_MAP[String(json.status)] ?? PaymentTransactionStatus.PENDING;
    return {
      externalTransactionId: String(json.id ?? ''),
      status,
      amount: fromStripeAmount(Number(json.amount ?? 0)),
      currency: String(json.currency ?? '').toUpperCase(),
      capturedAmount: json.amount_received !== undefined ? fromStripeAmount(Number(json.amount_received)) : undefined,
      raw: this.safeRaw({ ...json, chargeId: this.extractId(json.latest_charge as string | { id?: string } | undefined) }, traceId),
    };
  }

  /** Only non-secret, normalized fields — never the raw provider payload wholesale (it could carry customer PII/tokens). */
  private safeRaw(json: Record<string, unknown>, traceId: string): Record<string, unknown> {
    return {
      traceId,
      id: json.id,
      chargeId: json.chargeId,
      subscriptionId: json.subscriptionId,
      invoiceId: json.invoiceId,
      refundId: json.refundId,
      customerId: json.customerId,
      status: json.status,
      amount: json.amount,
      currency: json.currency,
    };
  }

  private extractId(value: string | { id?: string } | undefined): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string' ? value : value.id;
  }

  private extractErrorMessage(json: Record<string, unknown>): string {
    const error = json.error as Record<string, unknown> | undefined;
    return (error?.message as string) ?? 'Unknown Stripe error';
  }
}
