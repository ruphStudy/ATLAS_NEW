import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WebhookEvent, WebhookStatus, NormalizedWebhookPayload } from '../interfaces';

@Injectable()
export class WebhookValidator {
  private readonly MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_TIMESTAMP_DRIFT = 5 * 60 * 1000; // 5 minutes

  validateRegistrationRequest(params: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    callbackUrl: string;
    events: WebhookEvent[];
  }): void {
    if (!params.workspaceId?.trim()) {
      throw new BadRequestException('Workspace ID is required');
    }
    if (!params.accountId?.trim()) {
      throw new BadRequestException('Account ID is required');
    }
    if (!params.providerKey?.trim()) {
      throw new BadRequestException('Provider key is required');
    }
    if (!params.marketplaceKey?.trim()) {
      throw new BadRequestException('Marketplace key is required');
    }
    if (!params.callbackUrl?.trim()) {
      throw new BadRequestException('Callback URL is required');
    }
    if (!this.isValidUrl(params.callbackUrl)) {
      throw new BadRequestException('Invalid callback URL format');
    }
    if (!Array.isArray(params.events) || params.events.length === 0) {
      throw new BadRequestException('At least one event must be specified');
    }
    for (const event of params.events) {
      if (!Object.values(WebhookEvent).includes(event)) {
        throw new BadRequestException(`Invalid event type: ${event}`);
      }
    }
  }

  validateIncomingWebhook(payload: NormalizedWebhookPayload): void {
    if (!payload.externalEventId?.trim()) {
      throw new BadRequestException('Event ID is required');
    }
    if (!payload.event) {
      throw new BadRequestException('Event type is required');
    }
    if (!payload.timestamp) {
      throw new BadRequestException('Timestamp is required');
    }

    this.validateTimestamp(payload.timestamp);
  }

  validateTimestamp(timestamp: Date): void {
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();
    const drift = Math.abs(now - eventTime);

    if (drift > this.MAX_TIMESTAMP_DRIFT) {
      throw new UnauthorizedException('Webhook timestamp is outside acceptable range');
    }
  }

  validatePayloadSize(payload: any): void {
    const size = Buffer.byteLength(JSON.stringify(payload));
    if (size > this.MAX_PAYLOAD_SIZE) {
      throw new BadRequestException(`Payload size exceeds maximum allowed size of ${this.MAX_PAYLOAD_SIZE} bytes`);
    }
  }

  validateSignature(signature: string, expectedSignature: string): void {
    if (!signature || !expectedSignature) {
      throw new UnauthorizedException('Missing signature');
    }
    
    // Constant-time comparison to prevent timing attacks
    if (!this.secureCompare(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  validateStatus(status: WebhookStatus): void {
    if (!Object.values(WebhookStatus).includes(status)) {
      throw new BadRequestException(`Invalid webhook status: ${status}`);
    }
  }
}
