import { Injectable } from '@nestjs/common';
import { NormalizedShipmentItem } from '../interfaces';

@Injectable()
export class ShipmentMapper {
  normalizeInbound(
    raw: Record<string, unknown>,
    externalShipmentId: string,
    providerKey: string,
    marketplaceKey: string,
  ): NormalizedShipmentItem {
    return {
      externalShipmentId,
      externalOrderId: this.extractString(raw, ['orderId', 'order_id', 'externalOrderId']),
      externalTrackingNumber: this.extractString(raw, ['trackingNumber', 'tracking_number', 'trackingCode']),
      shipmentDate: this.extractDate(raw, ['shipmentDate', 'shipment_date', 'shippedAt', 'shipped_at']),
      status: this.normalizeStatus(this.extractString(raw, ['status', 'shipmentStatus', 'shipment_status'])),
      carrier: this.extractString(raw, ['carrier', 'carrierName', 'carrier_name']),
      carrierService: this.extractString(raw, ['carrierService', 'carrier_service', 'serviceLevel']),
      trackingNumber: this.extractString(raw, ['trackingNumber', 'tracking_number', 'trackingCode']),
      trackingUrl: this.extractString(raw, ['trackingUrl', 'tracking_url', 'trackingLink']),
      origin: this.extractAddress(raw, 'origin'),
      destination: this.extractAddress(raw, 'destination'),
      packages: this.extractPackages(raw),
      estimatedDeliveryDate: this.extractDate(raw, ['estimatedDeliveryDate', 'estimated_delivery_date', 'edd']),
      actualDeliveryDate: this.extractDate(raw, ['actualDeliveryDate', 'actual_delivery_date', 'deliveredAt']),
      dispatchDate: this.extractDate(raw, ['dispatchDate', 'dispatch_date', 'shippedAt']),
      totalWeight: this.extractNumber(raw, ['totalWeight', 'total_weight', 'weight']),
      weightUnit: this.extractString(raw, ['weightUnit', 'weight_unit']) ?? 'kg',
      shippingCost: this.extractNumber(raw, ['shippingCost', 'shipping_cost', 'cost']),
      currency: this.extractString(raw, ['currency', 'currencyCode', 'currency_code']),
      notes: this.extractString(raw, ['notes', 'description', 'comments']),
      metadata: { raw },
    };
  }

  normalizeOutbound(shipment: Record<string, unknown>): NormalizedShipmentItem {
    return {
      externalShipmentId: '',
      externalOrderId: this.extractString(shipment, ['externalOrderId', 'orderId']),
      shipmentDate: this.extractDate(shipment, ['dispatchDate', 'shipmentDate']),
      status: this.extractString(shipment, ['status']),
      carrier: this.extractString(shipment, ['carrier']),
      carrierService: this.extractString(shipment, ['shipmentMethod']),
      trackingNumber: this.extractString(shipment, ['trackingNumber']),
      origin: this.extractAddress(shipment, 'origin'),
      destination: this.extractAddress(shipment, 'destination'),
      packages: (shipment['packages'] as any[])?.map((p, idx) => ({
        packageNumber: idx + 1,
        trackingNumber: this.extractString(p, ['trackingNumber']),
        weight: this.extractNumber(p, ['weight']),
        weightUnit: this.extractString(p, ['weightUnit']) ?? 'kg',
        length: this.extractNumber(p, ['length']),
        width: this.extractNumber(p, ['width']),
        height: this.extractNumber(p, ['height']),
        dimensionUnit: this.extractString(p, ['dimensionUnit']) ?? 'cm',
      })) ?? [],
      estimatedDeliveryDate: this.extractDate(shipment, ['estimatedDeliveryDate']),
      actualDeliveryDate: this.extractDate(shipment, ['actualDeliveryDate']),
      dispatchDate: this.extractDate(shipment, ['dispatchDate']),
      totalWeight: this.extractNumber(shipment, ['totalWeight']),
      weightUnit: this.extractString(shipment, ['weightUnit']) ?? 'kg',
      shippingCost: this.extractNumber(shipment, ['shippingCost']),
      currency: this.extractString(shipment, ['currency']),
      notes: this.extractString(shipment, ['notes']),
      metadata: {},
    };
  }

  private extractAddress(raw: Record<string, unknown>, type: 'origin' | 'destination'): NormalizedShipmentItem['origin'] {
    const addr = (raw[type] ?? raw[`${type}Address`] ?? raw[`${type}_address`] ?? {}) as Record<string, unknown>;
    return {
      name: this.extractString(addr, ['name', 'companyName', 'company_name']),
      address: this.extractString(addr, ['address', 'street', 'line1', 'address1']),
      city: this.extractString(addr, ['city']),
      state: this.extractString(addr, ['state', 'province', 'region']),
      postalCode: this.extractString(addr, ['postalCode', 'postal_code', 'zip', 'zipCode']),
      country: this.extractString(addr, ['country', 'countryCode', 'country_code']),
    };
  }

  private extractPackages(raw: Record<string, unknown>): NormalizedShipmentItem['packages'] {
    const packages = (raw['packages'] ?? raw['items'] ?? []) as unknown[];
    return packages.map((pkg, idx) => {
      const p = pkg as Record<string, unknown>;
      return {
        externalPackageId: this.extractString(p, ['id', 'packageId', 'package_id']),
        packageNumber: this.extractNumber(p, ['packageNumber', 'package_number']) ?? idx + 1,
        trackingNumber: this.extractString(p, ['trackingNumber', 'tracking_number']),
        weight: this.extractNumber(p, ['weight']),
        weightUnit: this.extractString(p, ['weightUnit', 'weight_unit']) ?? 'kg',
        length: this.extractNumber(p, ['length']),
        width: this.extractNumber(p, ['width']),
        height: this.extractNumber(p, ['height']),
        dimensionUnit: this.extractString(p, ['dimensionUnit', 'dimension_unit']) ?? 'cm',
      };
    });
  }

  private normalizeStatus(status: string | undefined): string | undefined {
    if (!status) return undefined;
    const normalized = status.toUpperCase().replace(/[^A-Z]/g, '_');
    if (normalized.includes('DELIVER')) return 'DELIVERED';
    if (normalized.includes('TRANSIT') || normalized.includes('SHIP')) return 'IN_TRANSIT';
    if (normalized.includes('DISPATCH')) return 'DISPATCHED';
    if (normalized.includes('CANCEL')) return 'CANCELLED';
    if (normalized.includes('LOST')) return 'LOST';
    if (normalized.includes('DELAY')) return 'DELAYED';
    if (normalized.includes('CUSTOM')) return 'CUSTOMS_CLEARANCE';
    if (normalized.includes('OUT')) return 'OUT_FOR_DELIVERY';
    if (normalized.includes('READY')) return 'READY';
    return 'PENDING';
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
