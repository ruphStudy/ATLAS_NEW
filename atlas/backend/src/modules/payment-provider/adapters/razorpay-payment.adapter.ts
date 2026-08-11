import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { providerHttpRequest } from '../provider-http.util';
import { PAYMENT_PROVIDER_KEYS } from '../constants';
import {
  ICreatePaymentRequest,
  ICredentialValidationResult,
  INormalizedWebhookEvent,
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

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

/** Razorpay amounts are in the smallest currency unit (paise for INR) — a plain x100 conversion, matching Razorpay's own documented convention for its supported (2-decimal) currencies. */
function toRazorpayAmount(amount: number): number {
  return Math.round(amount * 100);
}

function fromRazorpayAmount(amount: number): number {
  return Math.round(amount) / 100;
}

/** Order/payment entity status → our normalized transaction status. */
const RAZORPAY_STATUS_MAP: Record<string, PaymentTransactionStatus> = {
  created: PaymentTransactionStatus.PENDING,
  attempted: PaymentTransactionStatus.PROCESSING,
  paid: PaymentTransactionStatus.SUCCEEDED,
  authorized: PaymentTransactionStatus.AUTHORIZED,
  captured: PaymentTransactionStatus.CAPTURED,
  refunded: PaymentTransactionStatus.REFUNDED,
  failed: PaymentTransactionStatus.FAILED,
};

/** Webhook `event` name → the raw status string the generic `PaymentWebhookService` maps to a transaction status. Kept a subset of that shared vocabulary (succeeded/captured/authorized/failed/refunded/cancelled) so no framework change is needed for Razorpay's event naming. */
const RAZORPAY_WEBHOOK_EVENT_TO_STATUS: Record<string, string> = {
  'payment.authorized': 'authorized',
  'payment.captured': 'captured',
  'payment.failed': 'failed',
  'order.paid': 'captured',
  'refund.created': 'processing',
  'refund.processed': 'refunded',
  'refund.failed': 'failed',
};

interface IRazorpayEntity {
  id?: string;
  order_id?: string;
  payment_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  utr?: string;
  [key: string]: unknown;
}

/**
 * All Razorpay-specific request shapes, authentication, ID mapping and
 * error parsing live here — nothing outside this file knows Razorpay's API
 * exists. Razorpay has no server-initiated "create a charge" endpoint the
 * way Stripe's PaymentIntents does: `createPayment` creates an Order (or,
 * for recurring flows, a Subscription) — the actual payment is completed
 * client-side via Razorpay Checkout and confirmed via webhook or
 * `getPaymentStatus`.
 */
@Injectable()
export class RazorpayPaymentAdapter implements IPaymentProviderAdapter {
  private readonly logger = new Logger(RazorpayPaymentAdapter.name);

  readonly metadata: IPaymentProviderMetadata = {
    providerKey: PAYMENT_PROVIDER_KEYS.RAZORPAY,
    displayName: 'Razorpay',
    supportedCapabilities: [
      PaymentCapability.PAYMENT,
      PaymentCapability.AUTHORIZATION,
      PaymentCapability.CAPTURE,
      PaymentCapability.REFUND,
      PaymentCapability.RECURRING,
      PaymentCapability.WEBHOOK,
    ],
    supportedCountries: ['IN'],
    supportedCurrencies: ['INR'],
    requiredCredentialFields: ['keyId', 'keySecret', 'webhookSecret'],
  };

  supportsCapability(capability: PaymentCapability): boolean {
    return this.metadata.supportedCapabilities.includes(capability);
  }

  supportsCountry(country: string): boolean {
    return this.metadata.supportedCountries.includes(country);
  }

  supportsCurrency(currency: string): boolean {
    return this.metadata.supportedCurrencies.includes(currency);
  }

  // ── Authentication & account validation ───────────────────────────

  async validateCredentials(fields: Record<string, string>): Promise<ICredentialValidationResult> {
    if (!fields.keyId || !fields.keySecret) {
      return { valid: false, message: 'keyId and keySecret are required' };
    }

    const traceId = this.newTraceId();
    const response = await this.request('GET', '/orders?count=1', fields, undefined, traceId).catch((error) => {
      this.logger.warn(`Razorpay credential validation request failed [${traceId}]: ${(error as Error).message}`);
      return null;
    });

    if (!response) {
      return { valid: false, message: 'Could not reach Razorpay to validate credentials' };
    }
    if (!response.ok) {
      return { valid: false, message: this.extractErrorMessage(response.json) };
    }
    if (!fields.webhookSecret) {
      return { valid: true, message: 'Keys are valid, but no webhookSecret was provided — inbound webhooks will fail signature verification' };
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
    const recurringPlanId = request.metadata?.recurringPlanId as string | undefined;
    if (recurringPlanId) {
      return this.createSubscription(request, recurringPlanId, credentials);
    }

    const traceId = this.newTraceId();
    const response = await this.request(
      'POST',
      '/orders',
      credentials,
      {
        amount: toRazorpayAmount(request.amount),
        currency: request.currency,
        receipt: request.idempotencyKey,
        // 0 = authorize-only (manual capture required afterwards), 1 = auto-capture on payment success.
        payment_capture: request.capture === false ? 0 : 1,
        notes: {
          idempotencyKey: request.idempotencyKey,
          description: request.description ?? '',
          customerEmail: request.customer?.email ?? '',
          customerExternalId: request.customer?.externalCustomerId ?? '',
        },
      },
      traceId,
    );

    if (!response.ok) {
      return { externalTransactionId: '', status: PaymentTransactionStatus.FAILED, amount: 0, currency: '', raw: this.safeRaw(response.json, traceId) };
    }

    return {
      externalTransactionId: String(response.json.id ?? ''),
      status: RAZORPAY_STATUS_MAP[String(response.json.status)] ?? PaymentTransactionStatus.PENDING,
      amount: fromRazorpayAmount(Number(response.json.amount ?? 0)),
      currency: String(response.json.currency ?? ''),
      raw: this.safeRaw({ ...response.json, orderId: response.json.id }, traceId),
    };
  }

  /** `Razorpay Subscriptions` — the recurring-payment analog to Orders. Requires a plan already configured in the Razorpay dashboard/API (`plan_id`); a customer is created (or reused, if `customer.externalCustomerId` already holds a Razorpay customer id) and attached implicitly by Razorpay Checkout at confirmation time. */
  private async createSubscription(request: ICreatePaymentRequest, planId: string, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const totalCount = (request.metadata?.totalCount as number | undefined) ?? 12;

    const response = await this.request(
      'POST',
      '/subscriptions',
      credentials,
      {
        plan_id: planId,
        customer_notify: 1,
        total_count: totalCount,
        quantity: 1,
        notes: {
          idempotencyKey: request.idempotencyKey,
          customerEmail: request.customer?.email ?? '',
          customerExternalId: request.customer?.externalCustomerId ?? '',
        },
      },
      traceId,
    );

    if (!response.ok) {
      return { externalTransactionId: '', status: PaymentTransactionStatus.FAILED, amount: 0, currency: request.currency, raw: this.safeRaw(response.json, traceId) };
    }

    return {
      externalTransactionId: String(response.json.id ?? ''),
      status: PaymentTransactionStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      raw: this.safeRaw({ ...response.json, subscriptionId: response.json.id, planId }, traceId),
    };
  }

  async capturePayment(externalTransactionId: string, amount: number | undefined, credentials: Record<string, string>): Promise<IPaymentResult> {
    // Razorpay's capture endpoint requires BOTH amount and currency; the shared adapter contract only carries an optional amount, so the payment is fetched first to fill in whatever the caller omitted.
    const paymentId = await this.resolvePaymentId(externalTransactionId, credentials);
    const current = await this.getPaymentStatus(paymentId, credentials);

    const traceId = this.newTraceId();
    const response = await this.request(
      'POST',
      `/payments/${paymentId}/capture`,
      credentials,
      { amount: toRazorpayAmount(amount ?? current.amount), currency: current.currency || 'INR' },
      traceId,
    );

    return this.toPaymentResult(response.json, response.ok, traceId);
  }

  /** Razorpay has no server-side cancel-payment endpoint — an unpaid/unauthorized order simply expires on its own. Reported as a best-effort local status only. */
  async cancelPayment(externalTransactionId: string): Promise<IPaymentResult> {
    return {
      externalTransactionId,
      status: PaymentTransactionStatus.CANCELLED,
      amount: 0,
      currency: '',
      raw: { note: 'Razorpay has no server-side cancel API for orders/payments — treated as locally cancelled' },
    };
  }

  async refundPayment(request: IRefundRequest, credentials: Record<string, string>): Promise<IPaymentResult> {
    const paymentId = await this.resolvePaymentId(request.externalTransactionId, credentials);
    const traceId = this.newTraceId();

    const response = await this.request(
      'POST',
      `/payments/${paymentId}/refund`,
      credentials,
      {
        amount: request.amount !== undefined ? toRazorpayAmount(request.amount) : undefined,
        notes: { reason: request.reason ?? '', idempotencyKey: request.idempotencyKey },
      },
      traceId,
    );

    if (!response.ok) {
      return { externalTransactionId: request.externalTransactionId, status: PaymentTransactionStatus.FAILED, amount: 0, currency: '', raw: this.safeRaw(response.json, traceId) };
    }

    return {
      externalTransactionId: request.externalTransactionId,
      status: PaymentTransactionStatus.REFUNDED,
      amount: fromRazorpayAmount(Number(response.json.amount ?? 0)),
      currency: String(response.json.currency ?? ''),
      refundedAmount: fromRazorpayAmount(Number(response.json.amount ?? 0)),
      raw: this.safeRaw({ ...response.json, refundId: response.json.id, paymentId }, traceId),
    };
  }

  async getPaymentStatus(externalTransactionId: string, credentials: Record<string, string>): Promise<IPaymentResult> {
    const traceId = this.newTraceId();
    const resource = externalTransactionId.startsWith('pay_') ? 'payments' : 'orders';
    const response = await this.request('GET', `/${resource}/${externalTransactionId}`, credentials, undefined, traceId);
    return this.toPaymentResult(response.json, response.ok, traceId, resource === 'orders' ? undefined : (response.json.order_id as string | undefined));
  }

  // ── Webhooks ─────────────────────────────────────────────────────

  /** `X-Razorpay-Signature: hex HMAC-SHA256(rawBody, webhookSecret)` — constant-time compared, never logged. */
  verifyWebhookSignature(headers: Record<string, string>, rawBody: string, webhookSecret: string): boolean {
    const providedSignature = headers['x-razorpay-signature'] ?? headers['X-Razorpay-Signature'];
    if (!providedSignature) return false;

    const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedSignature, 'hex'));
    } catch {
      return false;
    }
  }

  normalizeWebhookPayload(_headers: Record<string, string>, rawBody: string): INormalizedWebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      id?: string;
      event?: string;
      created_at?: number;
      payload?: {
        payment?: { entity?: IRazorpayEntity };
        refund?: { entity?: IRazorpayEntity };
        order?: { entity?: IRazorpayEntity };
        settlement?: { entity?: IRazorpayEntity };
      };
    };

    const paymentEntity = parsed.payload?.payment?.entity ?? {};
    const refundEntity = parsed.payload?.refund?.entity ?? {};
    const orderEntity = parsed.payload?.order?.entity ?? {};
    const settlementEntity = parsed.payload?.settlement?.entity ?? {};

    // Prefer the order id (what we stored as `externalTransactionId` at creation time) so the generic webhook pipeline's single-id lookup still finds the transaction for payment AND refund events alike.
    const externalTransactionId = orderEntity.id ?? paymentEntity.order_id ?? paymentEntity.id;
    const eventType = parsed.event ?? 'unknown';
    const status = RAZORPAY_WEBHOOK_EVENT_TO_STATUS[eventType];

    const externalEventId = parsed.id ?? `${eventType}:${paymentEntity.id ?? refundEntity.id ?? orderEntity.id ?? ''}:${parsed.created_at ?? ''}`;

    return {
      providerKey: this.metadata.providerKey,
      externalEventId,
      eventType,
      externalTransactionId,
      payload: {
        status,
        amount: (paymentEntity.amount ?? orderEntity.amount) !== undefined ? fromRazorpayAmount(Number(paymentEntity.amount ?? orderEntity.amount)) : undefined,
        currency: paymentEntity.currency ?? orderEntity.currency,
        paymentId: paymentEntity.id,
        orderId: orderEntity.id ?? paymentEntity.order_id,
        refundId: refundEntity.id,
        settlementId: settlementEntity.id,
        settlementUtr: settlementEntity.utr,
      },
    };
  }

  // ── Private ──────────────────────────────────────────────────────

  private authHeaders(keyId: string, keySecret: string): Record<string, string> {
    const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }

  private newTraceId(): string {
    return randomUUID();
  }

  /** Generic request helper — logs only the trace id/method/path, never headers/body (which may carry `keySecret`-derived auth or customer PII). */
  private async request(
    method: 'GET' | 'POST',
    path: string,
    credentials: Record<string, string>,
    body?: Record<string, unknown>,
    traceId?: string,
  ) {
    const trace = traceId ?? this.newTraceId();
    this.logger.debug(`Razorpay ${method} ${path} [trace=${trace}]`);

    return providerHttpRequest({
      url: `${RAZORPAY_API_BASE}${path}`,
      method,
      headers: { ...this.authHeaders(credentials.keyId, credentials.keySecret), 'Content-Type': 'application/json', 'X-Atlas-Trace-Id': trace },
      body: body ? JSON.stringify(this.stripUndefined(body)) : undefined,
    });
  }

  /** Accepts either a Razorpay order id (`order_xxx`) or payment id (`pay_xxx`) and always returns the payment id — capture/refund only operate on payments. */
  private async resolvePaymentId(externalTransactionId: string, credentials: Record<string, string>): Promise<string> {
    if (externalTransactionId.startsWith('pay_')) {
      return externalTransactionId;
    }

    const traceId = this.newTraceId();
    const response = await this.request('GET', `/orders/${externalTransactionId}/payments`, credentials, undefined, traceId);
    const items = (response.json.items as IRazorpayEntity[] | undefined) ?? [];
    const captured = items.find((p) => p.status === 'captured' || p.status === 'authorized');
    if (!captured?.id) {
      throw new Error(`No payment found for Razorpay order '${externalTransactionId}'`);
    }
    return captured.id;
  }

  private async probe(fields: Record<string, string>): Promise<IPaymentHealthResult> {
    const startedAt = Date.now();
    const traceId = this.newTraceId();
    try {
      const response = await this.request('GET', '/orders?count=1', fields, undefined, traceId);
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

  private toPaymentResult(json: Record<string, unknown>, ok: boolean, traceId: string, fallbackOrderId?: string): IPaymentResult {
    if (!ok) {
      return { externalTransactionId: String(json.id ?? ''), status: PaymentTransactionStatus.FAILED, amount: 0, currency: '', raw: this.safeRaw(json, traceId) };
    }

    const orderId = (json.order_id as string | undefined) ?? fallbackOrderId ?? String(json.id ?? '');

    return {
      externalTransactionId: orderId,
      status: RAZORPAY_STATUS_MAP[String(json.status)] ?? PaymentTransactionStatus.PENDING,
      amount: fromRazorpayAmount(Number(json.amount ?? 0)),
      currency: String(json.currency ?? ''),
      capturedAmount: json.amount_captured !== undefined ? fromRazorpayAmount(Number(json.amount_captured)) : undefined,
      raw: this.safeRaw({ ...json, paymentId: json.id, orderId }, traceId),
    };
  }

  /** Only non-secret, normalized fields — never the raw provider payload wholesale (it can carry customer PII/contact numbers). */
  private safeRaw(json: Record<string, unknown>, traceId: string): Record<string, unknown> {
    return {
      traceId,
      id: json.id,
      orderId: json.orderId ?? json.order_id,
      paymentId: json.paymentId,
      refundId: json.refundId,
      subscriptionId: json.subscriptionId,
      status: json.status,
      amount: json.amount,
      currency: json.currency,
    };
  }

  private stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
  }

  private extractErrorMessage(json: Record<string, unknown>): string {
    const error = json.error as Record<string, unknown> | undefined;
    return (error?.description as string) ?? 'Unknown Razorpay error';
  }
}
