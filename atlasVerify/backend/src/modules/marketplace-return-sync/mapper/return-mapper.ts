import { Injectable } from '@nestjs/common';
import { NormalizedReturnItem } from '../interfaces';

@Injectable()
export class ReturnMapper {
  normalizeInbound(
    raw: Record<string, unknown>,
    externalReturnId: string,
    providerKey: string,
    marketplaceKey: string,
  ): NormalizedReturnItem {
    return {
      externalReturnId,
      externalOrderId: this.extractString(raw, ['orderId', 'order_id', 'externalOrderId']),
      externalRmaNumber: this.extractString(raw, ['rmaNumber', 'rma_number', 'returnNumber']),
      returnDate: this.extractDate(raw, ['returnDate', 'return_date', 'createdAt', 'created_at']),
      status: this.normalizeStatus(this.extractString(raw, ['status', 'returnStatus', 'return_status'])),
      reason: this.extractString(raw, ['reason', 'returnReason', 'return_reason']),
      reasonCode: this.extractString(raw, ['reasonCode', 'reason_code']),
      customerComments: this.extractString(raw, ['customerComments', 'customer_comments', 'comments']),
      items: this.extractItems(raw),
      refund: this.extractRefund(raw),
      replacement: this.extractReplacement(raw),
      pickup: this.extractPickup(raw),
      resolution: this.extractString(raw, ['resolution', 'resolutionType', 'resolution_type']),
      resolutionDate: this.extractDate(raw, ['resolutionDate', 'resolution_date', 'resolvedAt']),
      inspectionNotes: this.extractString(raw, ['inspectionNotes', 'inspection_notes', 'qcNotes']),
      internalNotes: this.extractString(raw, ['internalNotes', 'internal_notes', 'notes']),
      restockFee: this.extractNumber(raw, ['restockFee', 'restock_fee']),
      totalRefundAmount: this.extractNumber(raw, ['totalRefundAmount', 'total_refund_amount', 'refundAmount']),
      currency: this.extractString(raw, ['currency', 'currencyCode', 'currency_code']),
      metadata: { raw },
    };
  }

  normalizeOutbound(returnData: Record<string, unknown>): NormalizedReturnItem {
    return {
      externalReturnId: '',
      externalOrderId: this.extractString(returnData, ['externalOrderId', 'orderId']),
      externalRmaNumber: this.extractString(returnData, ['rmaNumber']),
      returnDate: this.extractDate(returnData, ['returnDate', 'createdAt']),
      status: this.extractString(returnData, ['status']),
      reason: this.extractString(returnData, ['reason']),
      reasonCode: this.extractString(returnData, ['reasonCode']),
      customerComments: this.extractString(returnData, ['customerComments']),
      items: (returnData['items'] as any[])?.map((item) => ({
        externalItemId: this.extractString(item, ['externalItemId']),
        externalOrderItemId: this.extractString(item, ['externalOrderItemId']),
        sku: this.extractString(item, ['sku']),
        title: this.extractString(item, ['title']),
        quantityRequested: this.extractNumber(item, ['quantityRequested']),
        quantityReceived: this.extractNumber(item, ['quantityReceived']),
        quantityApproved: this.extractNumber(item, ['quantityApproved']),
        condition: this.extractString(item, ['condition']),
        defectDescription: this.extractString(item, ['defectDescription']),
      })) ?? [],
      resolution: this.extractString(returnData, ['resolution']),
      resolutionDate: this.extractDate(returnData, ['resolutionDate']),
      inspectionNotes: this.extractString(returnData, ['inspectionNotes']),
      internalNotes: this.extractString(returnData, ['internalNotes']),
      restockFee: this.extractNumber(returnData, ['restockFee']),
      totalRefundAmount: this.extractNumber(returnData, ['totalRefundAmount']),
      currency: this.extractString(returnData, ['currency']),
      metadata: {},
    };
  }

  private extractItems(raw: Record<string, unknown>): NormalizedReturnItem['items'] {
    const items = (raw['items'] ?? raw['returnItems'] ?? raw['line_items'] ?? []) as unknown[];
    return items.map((item) => {
      const i = item as Record<string, unknown>;
      return {
        externalItemId: this.extractString(i, ['id', 'itemId', 'item_id']),
        externalOrderItemId: this.extractString(i, ['orderItemId', 'order_item_id', 'lineItemId']),
        sku: this.extractString(i, ['sku']),
        title: this.extractString(i, ['title', 'name', 'productName']),
        quantityRequested: this.extractNumber(i, ['quantityRequested', 'quantity_requested', 'quantity']),
        quantityReceived: this.extractNumber(i, ['quantityReceived', 'quantity_received']),
        quantityApproved: this.extractNumber(i, ['quantityApproved', 'quantity_approved']),
        condition: this.extractString(i, ['condition', 'itemCondition']),
        defectDescription: this.extractString(i, ['defectDescription', 'defect_description', 'issue']),
      };
    });
  }

  private extractRefund(raw: Record<string, unknown>): NormalizedReturnItem['refund'] {
    const refund = (raw['refund'] ?? raw['refundInfo'] ?? {}) as Record<string, unknown>;
    if (!refund || Object.keys(refund).length === 0) return undefined;

    return {
      externalRefundId: this.extractString(refund, ['id', 'refundId', 'refund_id']),
      amount: this.extractNumber(refund, ['amount', 'refundAmount', 'refund_amount']),
      currency: this.extractString(refund, ['currency', 'currencyCode']),
      status: this.extractString(refund, ['status', 'refundStatus']),
      method: this.extractString(refund, ['method', 'refundMethod', 'paymentMethod']),
      processedAt: this.extractDate(refund, ['processedAt', 'processed_at', 'refundedAt']),
    };
  }

  private extractReplacement(raw: Record<string, unknown>): NormalizedReturnItem['replacement'] {
    const replacement = (raw['replacement'] ?? raw['replacementInfo'] ?? {}) as Record<string, unknown>;
    if (!replacement || Object.keys(replacement).length === 0) return undefined;

    return {
      externalReplacementId: this.extractString(replacement, ['id', 'replacementId']),
      status: this.extractString(replacement, ['status', 'replacementStatus']),
      shipmentId: this.extractString(replacement, ['shipmentId', 'shipment_id']),
      trackingNumber: this.extractString(replacement, ['trackingNumber', 'tracking_number']),
    };
  }

  private extractPickup(raw: Record<string, unknown>): NormalizedReturnItem['pickup'] {
    const pickup = (raw['pickup'] ?? raw['pickupInfo'] ?? {}) as Record<string, unknown>;
    if (!pickup || Object.keys(pickup).length === 0) return undefined;

    return {
      externalPickupId: this.extractString(pickup, ['id', 'pickupId', 'pickup_id']),
      carrier: this.extractString(pickup, ['carrier', 'carrierName']),
      trackingNumber: this.extractString(pickup, ['trackingNumber', 'tracking_number']),
      scheduledDate: this.extractDate(pickup, ['scheduledDate', 'scheduled_date']),
      completedDate: this.extractDate(pickup, ['completedDate', 'completed_date']),
    };
  }

  private normalizeStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    const normalized = status.toUpperCase().replace(/[^A-Z]/g, '_');
    if (normalized.includes('REFUND') || normalized.includes('COMPLETE')) return 'REFUNDED';
    if (normalized.includes('APPROV')) return 'APPROVED';
    if (normalized.includes('REJECT')) return 'REJECTED';
    if (normalized.includes('CANCEL')) return 'CANCELLED';
    if (normalized.includes('INSPECT')) return 'INSPECTED';
    if (normalized.includes('RECEIV')) return 'RECEIVED';
    if (normalized.includes('PICKUP')) return 'PICKUP_SCHEDULED';
    if (normalized.includes('PENDING')) return 'PENDING';
    return status;
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
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
    }
    return undefined;
  }

  private extractDate(obj: Record<string, unknown>, keys: string[]): Date | undefined {
    for (const key of keys) {
      const val = obj[key];
      if (val instanceof Date) return val;
      if (typeof val === 'string' || typeof val === 'number') {
        const date = new Date(val);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return undefined;
  }
}
