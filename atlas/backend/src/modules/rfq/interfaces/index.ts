// ── Enums ─────────────────────────────────────────────────────

export enum RfqStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_RESPONDED = 'PARTIALLY_RESPONDED',
  RESPONDED = 'RESPONDED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
}

export enum RfqSupplierResponseStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COUNTER_OFFERED = 'COUNTER_OFFERED',
}

// ── Rich sub-types ────────────────────────────────────────────

export interface RfqAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

// ── Core RFQ record ───────────────────────────────────────────

export interface IRfq {
  id: string;
  workspaceId: string;
  rfqNumber: string;
  productId?: string | null;
  opportunityId?: string | null;
  title: string;
  description?: string | null;
  status: RfqStatus;
  quantity: number;
  moq?: number | null;
  targetPrice?: number | null;
  currency: string;
  requiredDeliveryDate?: Date | null;
  expiresAt?: Date | null;
  paymentTerms?: string | null;
  shippingTerms?: string | null;
  notes?: string | null;
  attachments?: RfqAttachment[] | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── RFQ-Supplier record ───────────────────────────────────────

export interface IRfqSupplier {
  id: string;
  rfqId: string;
  supplierId: string;
  workspaceId: string;
  status: RfqSupplierResponseStatus;
  sentAt?: Date | null;
  respondedAt?: Date | null;
  // Supplier response fields
  quotedPrice?: number | null;
  quotedLeadTimeDays?: number | null;
  quotedMoq?: number | null;
  supplierNotes?: string | null;
  counterOfferDetails?: Record<string, unknown> | null;
  // Provider integration
  providerCode?: string | null;
  providerQuotationRef?: string | null;
  dispatchedViaProvider?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Events ────────────────────────────────────────────────────

export interface RfqEventPayload {
  rfqId: string;
  rfqNumber: string;
  workspaceId: string;
  status: RfqStatus;
}

export interface RfqRespondedEventPayload extends RfqEventPayload {
  supplierId: string;
  responseStatus: RfqSupplierResponseStatus;
}

// ── Queue job ─────────────────────────────────────────────────

export interface RfqNotificationJobPayload {
  rfqId: string;
  rfqNumber: string;
  workspaceId: string;
  event: string;
  supplierId?: string;
}
