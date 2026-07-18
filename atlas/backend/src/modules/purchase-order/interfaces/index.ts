export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  FULFILLED = 'FULFILLED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export interface POAddress {
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

export interface POLineItem {
  productId?: string;
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency?: string;
  notes?: string;
}

export interface POAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface IPurchaseOrder {
  id: string;
  workspaceId: string;
  poNumber: string;
  poSequence: number;
  version: number;
  procurementId?: string | null;
  supplierId?: string | null;

  // Provider integration
  providerCode?: string | null;
  providerPoRef?: string | null;

  status: PurchaseOrderStatus;
  lineItems: POLineItem[];
  totalAmount: number;
  currency: string;
  paymentTerms?: string | null;
  shippingTerms?: string | null;
  incoterms?: string | null;
  expectedDispatchDate?: Date | null;
  expectedDeliveryDate?: Date | null;
  billingAddress?: POAddress | null;
  shippingAddress?: POAddress | null;
  notes?: string | null;
  attachments?: POAttachment[] | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  issuedAt?: Date | null;
  acknowledgedAt?: Date | null;
  cancelReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IPurchaseOrderHistory {
  id: string;
  purchaseOrderId: string;
  workspaceId: string;
  fromStatus: PurchaseOrderStatus;
  toStatus: PurchaseOrderStatus;
  version: number;
  changedBy: string;
  reason?: string | null;
  createdAt: Date;
}

export interface PurchaseOrderJobPayload {
  purchaseOrderId: string;
  poNumber: string;
  workspaceId: string;
  event: string;
  changedBy?: string;
}
