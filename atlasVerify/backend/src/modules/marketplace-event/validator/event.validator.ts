import { Injectable, BadRequestException } from '@nestjs/common';
import { NormalizedMarketplaceEvent, MarketplaceEventType, EventValidationResult } from '../interfaces';

@Injectable()
export class EventValidator {
  validate(event: NormalizedMarketplaceEvent): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!event.externalEventId?.trim()) {
      errors.push('External event ID is required');
    }

    if (!event.eventType) {
      errors.push('Event type is required');
    }

    if (!Object.values(MarketplaceEventType).includes(event.eventType)) {
      errors.push(`Invalid event type: ${event.eventType}`);
    }

    if (!event.occurredAt) {
      errors.push('Occurred at timestamp is required');
    }

    if (event.occurredAt && isNaN(new Date(event.occurredAt).getTime())) {
      errors.push('Invalid occurred at timestamp');
    }

    if (!event.payload || typeof event.payload !== 'object') {
      errors.push('Payload is required and must be an object');
    }

    const occurredTime = new Date(event.occurredAt).getTime();
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    if (occurredTime < oneWeekAgo) {
      warnings.push('Event is more than one week old');
    }

    if (occurredTime > now + 60000) {
      warnings.push('Event timestamp is in the future');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateIncomingEvent(params: {
    workspaceId: string;
    accountId: string;
    providerKey: string;
    marketplaceKey: string;
    event: NormalizedMarketplaceEvent;
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

    const validation = this.validate(params.event);
    
    if (!validation.valid) {
      throw new BadRequestException(`Event validation failed: ${validation.errors.join(', ')}`);
    }
  }
}
