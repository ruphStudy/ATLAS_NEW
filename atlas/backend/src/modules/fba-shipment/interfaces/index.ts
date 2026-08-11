export enum FBAShipmentStatus {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  APPROVED = 'APPROVED',
  PREPARING = 'PREPARING',
  DISPATCHED = 'DISPATCHED',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CHECKED_IN = 'CHECKED_IN',
  RECEIVING = 'RECEIVING',
  RECEIVED = 'RECEIVED',
  CLOSED = 'CLOSED',
  PROBLEM = 'PROBLEM',
  CANCELLED = 'CANCELLED',
}

export enum FBAShipmentType {
  SINGLE_DESTINATION = 'SINGLE_DESTINATION',
  MULTI_DESTINATION = 'MULTI_DESTINATION',
}

export enum FBAShipmentPrepType {
  LABELING = 'LABELING',
  POLY_BAGGING = 'POLY_BAGGING',
  BUBBLE_WRAP = 'BUBBLE_WRAP',
  TAPING = 'TAPING',
  BLACK_SHRINK_WRAP = 'BLACK_SHRINK_WRAP',
  HANG_GARMENT = 'HANG_GARMENT',
  NO_PREP = 'NO_PREP',
  OTHER = 'OTHER',
}

export enum FBAShipmentLabelType {
  BARCODE_2D = 'BARCODE_2D',
  UNIQUE = 'UNIQUE',
  PALLET = 'PALLET',
  PARTNERED = 'PARTNERED',
  NON_PARTNERED = 'NON_PARTNERED',
}

export enum FBAShipmentCarrierType {
  PARTNER = 'PARTNER',
  NON_PARTNER = 'NON_PARTNER',
}

export enum FBAReceivingDiscrepancyType {
  SHORTAGE = 'SHORTAGE',
  EXCESS = 'EXCESS',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  QUANTITY_MISMATCH = 'QUANTITY_MISMATCH',
  PRODUCT_MISMATCH = 'PRODUCT_MISMATCH',
  OTHER = 'OTHER',
}

export enum FBAShipmentEvent {
  CREATED = 'fba-shipment.created',
  PLANNED = 'fba-shipment.planned',
  APPROVED = 'fba-shipment.approved',
  PREPARING_STARTED = 'fba-shipment.preparing_started',
  ITEM_ADDED = 'fba-shipment.item_added',
  ITEM_UPDATED = 'fba-shipment.item_updated',
  BOX_CREATED = 'fba-shipment.box_created',
  BOX_PACKED = 'fba-shipment.box_packed',
  DISPATCHED = 'fba-shipment.dispatched',
  SHIPPED = 'fba-shipment.shipped',
  IN_TRANSIT = 'fba-shipment.in_transit',
  DELIVERED = 'fba-shipment.delivered',
  CHECKED_IN = 'fba-shipment.checked_in',
  RECEIVING_STARTED = 'fba-shipment.receiving_started',
  RECEIVED = 'fba-shipment.received',
  DISCREPANCY_RECORDED = 'fba-shipment.discrepancy_recorded',
  DISCREPANCY_RECONCILED = 'fba-shipment.discrepancy_reconciled',
  CLOSED = 'fba-shipment.closed',
  PROBLEM_DETECTED = 'fba-shipment.problem_detected',
  CANCELLED = 'fba-shipment.cancelled',
}

export interface IFBAShipment {
  id: string;
  workspaceId: string;
  shipmentNumber: string;
  shipmentSequence: number;
  status: FBAShipmentStatus;
  shipmentType: FBAShipmentType;
  marketplaceAccountId: string;
  warehouseId: string;
  externalShipmentId?: string | null;
  externalShipmentName?: string | null;
  externalPlanId?: string | null;
  destinationFCId?: string | null;
  destinationFCName?: string | null;
  destinationAddress?: Record<string, unknown> | null;
  labelType?: FBAShipmentLabelType | null;
  carrierType?: FBAShipmentCarrierType | null;
  carrierName?: string | null;
  carrierId?: string | null;
  serviceType?: string | null;
  shipmentPlanUrl?: string | null;
  isCasePacked: boolean;
  isPartial: boolean;
  totalUnits: number;
  shippedUnits: number;
  receivedUnits: number;
  totalBoxes: number;
  shippedBoxes: number;
  prepInstructions?: Record<string, unknown> | null;
  packingTaskId?: string | null;
  dispatchTaskId?: string | null;
  transferId?: string | null;
  reservationId?: string | null;
  plannedAt?: Date | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  preparedAt?: Date | null;
  dispatchedAt?: Date | null;
  dispatchedBy?: string | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  checkedInAt?: Date | null;
  receivingStartedAt?: Date | null;
  receivedAt?: Date | null;
  closedAt?: Date | null;
  closedBy?: string | null;
  trackingReferences: unknown[];
  externalReferences: unknown[];
  documents: unknown[];
  errors: unknown[];
  priority: number;
  notes?: string | null;
  metadata: Record<string, unknown>;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IFBAShipmentItem {
  id: string;
  shipmentId: string;
  workspaceId: string;
  lineNumber: number;
  inventoryItemId: string;
  sku: string;
  fnsku?: string | null;
  asin?: string | null;
  productName?: string | null;
  variantId?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: Date | null;
  externalProductId?: string | null;
  externalListingId?: string | null;
  prepType?: FBAShipmentPrepType | null;
  prepRequired: boolean;
  labelRequired: boolean;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  condition: string;
  conditionNote?: string | null;
  eligibilityValidated: boolean;
  eligibilityErrors: unknown[];
  reservationLineId?: string | null;
  allocationLineId?: string | null;
  transactionId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFBAShipmentBox {
  id: string;
  shipmentId: string;
  workspaceId: string;
  boxNumber: string;
  boxSequence: number;
  externalBoxId?: string | null;
  packageId?: string | null;
  packingPackageId?: string | null;
  packageType?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit: string;
  weight?: number | null;
  weightUnit: string;
  totalUnits: number;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  evidenceUrls: string[];
  shipped: boolean;
  shippedAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFBAShipmentBoxContent {
  id: string;
  boxId: string;
  itemId: string;
  workspaceId: string;
  quantity: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFBAReceivingDiscrepancy {
  id: string;
  shipmentId: string;
  itemId?: string | null;
  workspaceId: string;
  discrepancyType: FBAReceivingDiscrepancyType;
  sku?: string | null;
  fnsku?: string | null;
  asin?: string | null;
  expectedQuantity?: number | null;
  shippedQuantity?: number | null;
  receivedQuantity?: number | null;
  varianceQuantity?: number | null;
  description: string;
  externalReference?: string | null;
  evidenceUrls: string[];
  reconciled: boolean;
  reconciledBy?: string | null;
  reconciledAt?: Date | null;
  reconciliationNotes?: string | null;
  adjustmentId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
