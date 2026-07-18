export enum ShipmentStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMS_CLEARANCE = 'CUSTOMS_CLEARANCE',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  DELAYED = 'DELAYED',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export interface ShipmentAddress {
  companyName?: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface ShipmentPackage {
  packageNumber: number;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  description?: string;
  trackingNumber?: string;
}

export interface ShipmentAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface ShipmentTrackingEvent {
  timestamp: Date;
  status: ShipmentStatus;
  location?: string;
  description: string;
  source: 'MANUAL' | 'CARRIER' | 'SYSTEM';
}

export interface IShipment {
  id: string;
  workspaceId: string;
  shipmentNumber: string;
  shipmentSequence: number;
  purchaseOrderId?: string | null;
  supplierId?: string | null;
  status: ShipmentStatus;
  isPartial: boolean;
  carrier?: string | null;
  trackingNumber?: string | null;
  shipmentMethod?: string | null;
  origin?: ShipmentAddress | null;
  destination?: ShipmentAddress | null;
  dispatchDate?: Date | null;
  estimatedDeliveryDate?: Date | null;
  actualDeliveryDate?: Date | null;
  shippingCost?: number | null;
  currency?: string | null;
  totalWeight?: number | null;
  weightUnit?: string | null;
  packages?: ShipmentPackage[] | null;
  notes?: string | null;
  attachments?: ShipmentAttachment[] | null;
  lastTrackedAt?: Date | null;
  cancelReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IShipmentTrackingHistory {
  id: string;
  shipmentId: string;
  workspaceId: string;
  fromStatus: ShipmentStatus;
  toStatus: ShipmentStatus;
  location?: string | null;
  description: string;
  source: string;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ShipmentJobPayload {
  shipmentId: string;
  shipmentNumber: string;
  workspaceId: string;
  event: string;
  trackingNumber?: string | null;
  carrier?: string | null;
}

export interface TrackingSyncJobPayload {
  shipmentId: string;
  shipmentNumber: string;
  workspaceId: string;
  trackingNumber: string;
  carrier: string;
}
