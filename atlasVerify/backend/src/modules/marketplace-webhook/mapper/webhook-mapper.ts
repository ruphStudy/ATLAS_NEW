import { Injectable } from '@nestjs/common';
import { NormalizedWebhookPayload, WebhookEvent } from '../interfaces';

@Injectable()
export class WebhookMapper {
  normalizeInbound(
    headers: Record<string, string>,
    body: any,
    providerKey: string,
    marketplaceKey: string,
  ): Partial<NormalizedWebhookPayload> {
    return {
      externalEventId: this.extractEventId(body, headers),
      externalWebhookId: this.extractWebhookId(body, headers),
      event: this.mapProviderEvent(body.type || body.event_type || body.eventType, providerKey),
      timestamp: this.extractTimestamp(body, headers),
      providerEvent: String(body.type || body.event_type || body.eventType || 'unknown'),
      signature: this.extractSignature(headers),
      payload: this.sanitizePayload(body),
      headers: this.sanitizeHeaders(headers),
      metadata: {
        attempt: Number(headers['x-webhook-attempt'] || headers['x-attempt'] || 1),
        retryable: this.isRetryable(body),
      },
      rawData: body,
    };
  }

  private extractEventId(body: any, headers: Record<string, string>): string {
    return String(
      body.id ||
      body.event_id ||
      body.eventId ||
      headers['x-event-id'] ||
      headers['x-webhook-id'] ||
      `evt_${Date.now()}`,
    );
  }

  private extractWebhookId(body: any, headers: Record<string, string>): string {
    return String(
      body.webhook_id ||
      body.webhookId ||
      headers['x-webhook-id'] ||
      'unknown',
    );
  }

  private extractTimestamp(body: any, headers: Record<string, string>): Date {
    const timestamp =
      body.timestamp ||
      body.created_at ||
      body.createdAt ||
      body.occurred_at ||
      headers['x-timestamp'] ||
      headers['x-webhook-timestamp'];

    if (timestamp) {
      const parsed = Number(timestamp);
      if (!isNaN(parsed)) {
        // Unix timestamp (in seconds or milliseconds)
        return new Date(parsed > 10000000000 ? parsed : parsed * 1000);
      }
      return new Date(timestamp);
    }

    return new Date();
  }

  private extractSignature(headers: Record<string, string>): string | undefined {
    return (
      headers['x-signature'] ||
      headers['x-webhook-signature'] ||
      headers['x-hub-signature'] ||
      headers['signature'] ||
      undefined
    );
  }

  private mapProviderEvent(providerEvent: string, providerKey: string): WebhookEvent {
    if (!providerEvent) return WebhookEvent.CUSTOM;

    const normalized = String(providerEvent).toUpperCase().replace(/[-_.\s]/g, '');

    // Order events
    if (normalized.includes('ORDERCREATE') || normalized.includes('ORDERNEW')) {
      return WebhookEvent.ORDER_CREATED;
    }
    if (normalized.includes('ORDERUPDATE') || normalized.includes('ORDERCHANGE')) {
      return WebhookEvent.ORDER_UPDATED;
    }
    if (normalized.includes('ORDERCANCEL')) {
      return WebhookEvent.ORDER_CANCELLED;
    }
    if (normalized.includes('ORDERSHIP') || normalized.includes('SHIPPED')) {
      return WebhookEvent.ORDER_SHIPPED;
    }
    if (normalized.includes('ORDERDELIVER') || normalized.includes('DELIVERED')) {
      return WebhookEvent.ORDER_DELIVERED;
    }

    // Listing events
    if (normalized.includes('LISTINGCREATE') || normalized.includes('PRODUCTCREATE')) {
      return WebhookEvent.LISTING_CREATED;
    }
    if (normalized.includes('LISTINGUPDATE') || normalized.includes('PRODUCTUPDATE')) {
      return WebhookEvent.LISTING_UPDATED;
    }
    if (normalized.includes('LISTINGDELETE') || normalized.includes('PRODUCTDELETE')) {
      return WebhookEvent.LISTING_DELETED;
    }

    // Inventory events
    if (normalized.includes('INVENTORY') || normalized.includes('STOCK')) {
      return WebhookEvent.INVENTORY_UPDATED;
    }

    // Price events
    if (normalized.includes('PRICE') || normalized.includes('PRICING')) {
      return WebhookEvent.PRICE_UPDATED;
    }

    // Return events
    if (normalized.includes('RETURNREQUEST') || normalized.includes('RETURNCREATE')) {
      return WebhookEvent.RETURN_REQUESTED;
    }
    if (normalized.includes('RETURNAPPROVE')) {
      return WebhookEvent.RETURN_APPROVED;
    }
    if (normalized.includes('RETURNREJECT')) {
      return WebhookEvent.RETURN_REJECTED;
    }

    // Shipment events
    if (normalized.includes('SHIPMENTCREATE')) {
      return WebhookEvent.SHIPMENT_CREATED;
    }
    if (normalized.includes('SHIPMENTUPDATE')) {
      return WebhookEvent.SHIPMENT_UPDATED;
    }

    // Payment events
    if (normalized.includes('PAYMENT') || normalized.includes('PAID')) {
      return WebhookEvent.PAYMENT_RECEIVED;
    }
    if (normalized.includes('REFUND')) {
      return WebhookEvent.REFUND_ISSUED;
    }

    // Dispute events
    if (normalized.includes('DISPUTEOPEN') || normalized.includes('DISPUTECREATE')) {
      return WebhookEvent.DISPUTE_OPENED;
    }
    if (normalized.includes('DISPUTERESOLVE') || normalized.includes('DISPUTECLOSE')) {
      return WebhookEvent.DISPUTE_RESOLVED;
    }

    // Account events
    if (normalized.includes('ACCOUNTSUSPEND')) {
      return WebhookEvent.ACCOUNT_SUSPENDED;
    }
    if (normalized.includes('ACCOUNTACTIVATE')) {
      return WebhookEvent.ACCOUNT_ACTIVATED;
    }

    return WebhookEvent.CUSTOM;
  }

  private sanitizePayload(payload: any): Record<string, any> {
    if (typeof payload !== 'object' || payload === null) {
      return { data: payload };
    }

    const sanitized = { ...payload };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'token', 'api_key', 'apiKey', 'credential'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const relevantHeaders = [
      'content-type',
      'x-event-id',
      'x-webhook-id',
      'x-timestamp',
      'x-signature',
      'x-webhook-signature',
      'x-attempt',
      'user-agent',
    ];

    for (const key of Object.keys(headers)) {
      const lowerKey = key.toLowerCase();
      if (relevantHeaders.includes(lowerKey)) {
        sanitized[lowerKey] = headers[key];
      }
    }

    return sanitized;
  }

  private isRetryable(body: any): boolean {
    // Most webhook events should be retryable unless explicitly marked
    return body.retryable !== false;
  }
}
