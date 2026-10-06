import { Injectable } from '@nestjs/common';
import {
  MarketplaceEventType,
  EventCategory,
  EventPriority,
  EventClassificationResult,
} from '../interfaces';

@Injectable()
export class EventClassifier {
  classify(eventType: MarketplaceEventType): EventClassificationResult {
    const category = this.categorizeEvent(eventType);
    const priority = this.determinePriority(eventType);
    const shouldProcess = this.shouldProcessEvent(eventType);

    return {
      eventType,
      category,
      priority,
      shouldProcess,
      reason: shouldProcess ? undefined : 'Event type not supported for processing',
    };
  }

  private categorizeEvent(eventType: MarketplaceEventType): EventCategory {
    const catalogEvents = [MarketplaceEventType.CATALOG_UPDATED];
    const inventoryEvents = [MarketplaceEventType.INVENTORY_UPDATED];
    const listingEvents = [
      MarketplaceEventType.LISTING_CREATED,
      MarketplaceEventType.LISTING_UPDATED,
      MarketplaceEventType.LISTING_DELETED,
    ];
    const orderEvents = [
      MarketplaceEventType.ORDER_CREATED,
      MarketplaceEventType.ORDER_UPDATED,
      MarketplaceEventType.ORDER_CANCELLED,
      MarketplaceEventType.ORDER_SHIPPED,
      MarketplaceEventType.ORDER_DELIVERED,
    ];
    const shipmentEvents = [
      MarketplaceEventType.SHIPMENT_CREATED,
      MarketplaceEventType.SHIPMENT_UPDATED,
    ];
    const returnEvents = [
      MarketplaceEventType.RETURN_REQUESTED,
      MarketplaceEventType.RETURN_APPROVED,
      MarketplaceEventType.RETURN_REJECTED,
      MarketplaceEventType.RETURN_COMPLETED,
    ];
    const pricingEvents = [MarketplaceEventType.PRICE_UPDATED];
    const paymentEvents = [
      MarketplaceEventType.PAYMENT_RECEIVED,
      MarketplaceEventType.REFUND_ISSUED,
    ];
    const reportEvents = [MarketplaceEventType.REPORT_AVAILABLE];
    const accountEvents = [
      MarketplaceEventType.ACCOUNT_SUSPENDED,
      MarketplaceEventType.ACCOUNT_ACTIVATED,
    ];
    const disputeEvents = [
      MarketplaceEventType.DISPUTE_OPENED,
      MarketplaceEventType.DISPUTE_RESOLVED,
    ];

    if (catalogEvents.includes(eventType)) return EventCategory.CATALOG;
    if (inventoryEvents.includes(eventType)) return EventCategory.INVENTORY;
    if (listingEvents.includes(eventType)) return EventCategory.LISTING;
    if (orderEvents.includes(eventType)) return EventCategory.ORDER;
    if (shipmentEvents.includes(eventType)) return EventCategory.SHIPMENT;
    if (returnEvents.includes(eventType)) return EventCategory.RETURN;
    if (pricingEvents.includes(eventType)) return EventCategory.PRICING;
    if (paymentEvents.includes(eventType)) return EventCategory.PAYMENT;
    if (reportEvents.includes(eventType)) return EventCategory.REPORT;
    if (accountEvents.includes(eventType)) return EventCategory.ACCOUNT;
    if (disputeEvents.includes(eventType)) return EventCategory.DISPUTE;

    return EventCategory.UNKNOWN;
  }

  private determinePriority(eventType: MarketplaceEventType): EventPriority {
    const criticalEvents = [
      MarketplaceEventType.ACCOUNT_SUSPENDED,
      MarketplaceEventType.ORDER_CANCELLED,
    ];
    const highPriorityEvents = [
      MarketplaceEventType.ORDER_CREATED,
      MarketplaceEventType.PAYMENT_RECEIVED,
      MarketplaceEventType.DISPUTE_OPENED,
      MarketplaceEventType.RETURN_REQUESTED,
    ];
    const lowPriorityEvents = [
      MarketplaceEventType.REPORT_AVAILABLE,
      MarketplaceEventType.CATALOG_UPDATED,
    ];

    if (criticalEvents.includes(eventType)) return EventPriority.CRITICAL;
    if (highPriorityEvents.includes(eventType)) return EventPriority.HIGH;
    if (lowPriorityEvents.includes(eventType)) return EventPriority.LOW;

    return EventPriority.NORMAL;
  }

  private shouldProcessEvent(eventType: MarketplaceEventType): boolean {
    return eventType !== MarketplaceEventType.UNKNOWN;
  }
}
