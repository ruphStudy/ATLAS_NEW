import { Injectable } from '@nestjs/common';
import {
  InventoryAdapterItem,
  InventoryItemType,
  NormalizedInventoryItem,
  AdjustmentAdapterItem,
  NormalizedAdjustment,
  InventoryAdjustmentType,
} from '../interfaces';

@Injectable()
export class InventoryMapper {
  /**
   * Normalize an inbound marketplace inventory record to ATLAS format.
   */
  normalizeInbound(
    adapterItem: InventoryAdapterItem,
    providerKey: string,
    marketplaceKey: string,
  ): NormalizedInventoryItem {
    const d = adapterItem.data ?? {};

    return {
      externalId: adapterItem.externalId,
      externalSku: this.str(d, ['sku', 'seller_sku', 'merchant_sku', 'asin']),
      warehouseId: this.str(d, ['warehouseId', 'warehouse_id', 'fulfillment_center_id']),
      itemType: this.resolveItemType(d),
      available: this.num(d, ['available', 'availableQuantity', 'sellable_quantity', 'fulfillable_quantity']) ?? 0,
      reserved: this.num(d, ['reserved', 'reservedQuantity', 'reserved_quantity', 'pending_quantity']) ?? 0,
      incoming: this.num(d, ['incoming', 'incomingQuantity', 'inbound_quantity', 'in_transit_quantity']) ?? 0,
      safetyStock: this.num(d, ['safetyStock', 'safety_stock', 'reorder_point']) ?? 0,
      updatedAt: adapterItem.updatedAt ?? null,
      checksum: adapterItem.checksum ?? null,
      raw: this.sanitize(d),
    };
  }

  /**
   * Normalize outbound ATLAS inventory for marketplace push.
   */
  normalizeOutbound(
    atlasData: Record<string, unknown>,
    externalId: string,
    providerKey: string,
    marketplaceKey: string,
  ): Record<string, unknown> {
    return {
      externalId,
      sku: atlasData['sku'],
      warehouseId: atlasData['warehouseId'] ?? null,
      available: atlasData['available'] ?? 0,
      reserved: atlasData['reserved'] ?? 0,
      incoming: atlasData['incoming'] ?? 0,
      safetyStock: atlasData['safetyStock'] ?? 0,
      _providerKey: providerKey.toUpperCase(),
      _marketplaceKey: marketplaceKey.toUpperCase(),
    };
  }

  /**
   * Normalize an inbound marketplace adjustment record.
   */
  normalizeAdjustment(item: AdjustmentAdapterItem): NormalizedAdjustment {
    const d = item.data ?? {};
    return {
      externalId: item.externalId ?? null,
      sku: item.sku ?? this.str(d, ['sku', 'seller_sku']) ?? null,
      warehouseId: this.str(d, ['warehouseId', 'warehouse_id']) ?? null,
      adjustmentType: this.resolveAdjustmentType(d),
      quantity: this.num(d, ['quantity', 'adjustedQuantity', 'adjustment_quantity']) ?? 0,
      reason: this.str(d, ['reason', 'adjustmentReason', 'adjustment_reason']),
      notes: this.str(d, ['notes', 'comment', 'description']),
      appliedAt: d['adjustedAt'] ? new Date(d['adjustedAt'] as string) : null,
      raw: this.sanitize(d),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private str(d: Record<string, unknown>, keys: string[]): string | null {
    for (const k of keys) {
      if (d[k] && typeof d[k] === 'string') return d[k] as string;
    }
    return null;
  }

  private num(d: Record<string, unknown>, keys: string[]): number | null {
    for (const k of keys) {
      if (d[k] !== undefined && d[k] !== null) {
        const n = Number(d[k]);
        if (!isNaN(n)) return n;
      }
    }
    return null;
  }

  private resolveItemType(d: Record<string, unknown>): InventoryItemType {
    const t = String(d['itemType'] ?? d['item_type'] ?? d['type'] ?? '').toUpperCase();
    if (t === 'AVAILABLE') return InventoryItemType.AVAILABLE;
    if (t === 'RESERVED') return InventoryItemType.RESERVED;
    if (t === 'INCOMING') return InventoryItemType.INCOMING;
    if (t === 'SAFETY_STOCK') return InventoryItemType.SAFETY_STOCK;
    return InventoryItemType.AVAILABLE;
  }

  private resolveAdjustmentType(d: Record<string, unknown>): InventoryAdjustmentType {
    const t = String(d['adjustmentType'] ?? d['type'] ?? d['reason'] ?? '').toUpperCase();
    if (t.includes('RECEIVE')) return InventoryAdjustmentType.RECEIVED;
    if (t.includes('SOLD')) return InventoryAdjustmentType.SOLD;
    if (t.includes('RETURN')) return InventoryAdjustmentType.RETURNED;
    if (t.includes('DAMAGE')) return InventoryAdjustmentType.DAMAGED;
    if (t.includes('LOST')) return InventoryAdjustmentType.LOST;
    if (t.includes('TRANSFER')) return InventoryAdjustmentType.TRANSFER;
    if (t.includes('RESERV')) return InventoryAdjustmentType.RESERVATION;
    return InventoryAdjustmentType.CORRECTION;
  }

  private sanitize(d: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (k.match(/(secret|token|password|credential|key)/i)) continue;
      clean[k] = v;
    }
    return clean;
  }
}
    if (t === 'INCOMING') return InventoryItemType.INCOMING;
    if (t === 'SAFETY_STOCK') return InventoryItemType.SAFETY_STOCK;
    if (t === 'ADJUSTMENT') return InventoryItemType.ADJUSTMENT;
    if (t === 'RESERVATION') return InventoryItemType.RESERVATION;
    return InventoryItemType.ALL;
  }

  private resolveAdjustmentType(d: Record<string, unknown>): InventoryAdjustmentType {
    const t = String(d['adjustmentType'] ?? d['type'] ?? d['reason'] ?? '').toUpperCase();
    if (t.includes('RECEIV') || t.includes('INBOUND')) return InventoryAdjustmentType.RECEIVED;
    if (t.includes('SOLD') || t.includes('SALE')) return InventoryAdjustmentType.SOLD;
    if (t.includes('RETURN')) return InventoryAdjustmentType.RETURNED;
    if (t.includes('DAMAGE')) return InventoryAdjustmentType.DAMAGED;
    if (t.includes('LOST')) return InventoryAdjustmentType.LOST;
    if (t.includes('TRANSFER')) return InventoryAdjustmentType.TRANSFER;
    if (t.includes('RESERV') && t.includes('CANCEL')) return InventoryAdjustmentType.RESERVATION_CANCEL;
    if (t.includes('RESERV')) return InventoryAdjustmentType.RESERVATION;
    return InventoryAdjustmentType.CORRECTION;
  }

  private sanitize(d: Record<string, unknown>): Record<string, unknown> {
    const unsafe = /secret|token|password|credential|key|auth/i;
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, unsafe.test(k) ? '***' : v]));
  }
}
