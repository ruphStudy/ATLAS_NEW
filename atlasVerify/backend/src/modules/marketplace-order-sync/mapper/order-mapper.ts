import { Injectable } from '@nestjs/common';
import { NormalizedOrderItem, OrderStatus } from '../interfaces';

@Injectable()
export class OrderMapper {
  normalizeInbound(
    raw: Record<string, unknown>,
    externalOrderId: string,
    providerKey: string,
    marketplaceKey: string,
  ): NormalizedOrderItem {
    return {
      externalOrderId,
      externalOrderNumber: this.extractString(raw, ['orderNumber', 'order_number', 'number']),
      orderDate: this.extractDate(raw, ['orderDate', 'order_date', 'createdAt', 'created_at']),
      status: this.normalizeStatus(this.extractString(raw, ['status', 'orderStatus', 'order_status'])),
      customer: this.extractCustomer(raw),
      billingAddress: this.extractAddress(raw, 'billing'),
      shippingAddress: this.extractAddress(raw, 'shipping'),
      items: this.extractItems(raw),
      subtotal: this.extractNumber(raw, ['subtotal', 'subtotalPrice', 'subtotal_price']),
      tax: this.extractNumber(raw, ['tax', 'totalTax', 'total_tax']),
      discount: this.extractNumber(raw, ['discount', 'totalDiscount', 'total_discount']),
      shipping: this.extractNumber(raw, ['shipping', 'shippingPrice', 'shipping_price']),
      total: this.extractNumber(raw, ['total', 'totalPrice', 'total_price']),
      currency: this.extractString(raw, ['currency', 'currencyCode', 'currency_code']),
      paymentMethod: this.extractString(raw, ['paymentMethod', 'payment_method', 'paymentGateway']),
      paymentStatus: this.extractString(raw, ['paymentStatus', 'payment_status', 'financialStatus']),
      externalTransactionId: this.extractString(raw, ['transactionId', 'transaction_id', 'paymentId']),
      shippingMethod: this.extractString(raw, ['shippingMethod', 'shipping_method', 'shippingCarrier']),
      trackingNumber: this.extractString(raw, ['trackingNumber', 'tracking_number', 'trackingCode']),
      notes: this.extractString(raw, ['notes', 'customerNote', 'note']),
      tags: this.extractTags(raw),
      metadata: { raw },
    };
  }

  private extractCustomer(raw: Record<string, unknown>): NormalizedOrderItem['customer'] {
    const customer = (raw['customer'] ?? raw['billing'] ?? {}) as Record<string, unknown>;
    return {
      externalCustomerId: this.extractString(customer, ['id', 'customerId', 'customer_id']),
      name: this.extractString(customer, ['name', 'fullName', 'full_name']) ?? this.buildFullName(customer),
      email: this.extractString(customer, ['email', 'emailAddress', 'email_address']),
      phone: this.extractString(customer, ['phone', 'phoneNumber', 'phone_number']),
    };
  }

  private buildFullName(customer: Record<string, unknown>): string | undefined {
    const first = this.extractString(customer, ['firstName', 'first_name']);
    const last = this.extractString(customer, ['lastName', 'last_name']);
    if (first && last) return `${first} ${last}`.trim();
    return first || last || undefined;
  }

  private extractAddress(raw: Record<string, unknown>, type: 'billing' | 'shipping'): NormalizedOrderItem['billingAddress'] {
    const addr = (raw[`${type}Address`] ?? raw[`${type}_address`] ?? raw[type] ?? {}) as Record<string, unknown>;
    return {
      line1: this.extractString(addr, ['line1', 'address1', 'address_1', 'street']),
      line2: this.extractString(addr, ['line2', 'address2', 'address_2']),
      city: this.extractString(addr, ['city']),
      state: this.extractString(addr, ['state', 'province', 'region']),
      postalCode: this.extractString(addr, ['postalCode', 'postal_code', 'zip', 'zipCode']),
      country: this.extractString(addr, ['country', 'countryCode', 'country_code']),
    };
  }

  private extractItems(raw: Record<string, unknown>): NormalizedOrderItem['items'] {
    const items = (raw['items'] ?? raw['lineItems'] ?? raw['line_items'] ?? []) as unknown[];
    return items.map((item) => {
      const i = item as Record<string, unknown>;
      return {
        externalItemId: this.extractString(i, ['id', 'lineItemId', 'line_item_id']),
        sku: this.extractString(i, ['sku', 'variantSku', 'variant_sku']),
        title: this.extractString(i, ['title', 'name', 'productName']),
        quantity: this.extractNumber(i, ['quantity', 'qty']) ?? 1,
        unitPrice: this.extractNumber(i, ['unitPrice', 'unit_price', 'price']),
        totalPrice: this.extractNumber(i, ['totalPrice', 'total_price', 'total']),
        tax: this.extractNumber(i, ['tax', 'taxAmount', 'tax_amount']),
        discount: this.extractNumber(i, ['discount', 'discountAmount', 'discount_amount']),
      };
    });
  }

  private extractTags(raw: Record<string, unknown>): string[] | undefined {
    const tags = raw['tags'] ?? raw['labels'];
    if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
    if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean);
    return undefined;
  }

  private normalizeStatus(status: string | undefined): OrderStatus | undefined {
    if (!status) return undefined;
    const normalized = status.toUpperCase().replace(/[^A-Z]/g, '_');
    if (normalized.includes('CANCEL')) return OrderStatus.CANCELLED;
    if (normalized.includes('REFUND')) return OrderStatus.REFUNDED;
    if (normalized.includes('RETURN')) return OrderStatus.RETURNED;
    if (normalized.includes('DELIVER')) return OrderStatus.DELIVERED;
    if (normalized.includes('SHIP')) return OrderStatus.SHIPPED;
    if (normalized.includes('PROCESS')) return OrderStatus.PROCESSING;
    if (normalized.includes('CONFIRM')) return OrderStatus.CONFIRMED;
    if (normalized.includes('FAIL')) return OrderStatus.FAILED;
    if (normalized.includes('PEND')) return OrderStatus.PENDING;
    return undefined;
  }

  private extractString(obj: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return undefined;
  }

  private extractNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return undefined;
  }

  private extractDate(obj: Record<string, unknown>, keys: string[]): Date | undefined {
    for (const key of keys) {
      const val = obj[key];
      if (val instanceof Date) return val;
      if (typeof val === 'string' || typeof val === 'number') {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return undefined;
  }
}
