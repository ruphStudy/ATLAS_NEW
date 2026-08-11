export enum InvoiceType {
  RECURRING = 'RECURRING',
  ONE_TIME = 'ONE_TIME',
  ADJUSTMENT = 'ADJUSTMENT',
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum InvoiceDeliveryStatus {
  NOT_SENT = 'NOT_SENT',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum InvoiceChangeType {
  CREATED = 'CREATED',
  ISSUED = 'ISSUED',
  SENT = 'SENT',
  DOWNLOADED = 'DOWNLOADED',
  VOIDED = 'VOIDED',
  CANCELLED = 'CANCELLED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  ADJUSTED = 'ADJUSTED',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
}

export enum InvoiceManagementEvent {
  INVOICE_CREATED = 'invoice-management.invoice_created',
  INVOICE_ISSUED = 'invoice-management.invoice_issued',
  INVOICE_SENT = 'invoice-management.invoice_sent',
  INVOICE_PAID = 'invoice-management.invoice_paid',
  INVOICE_PARTIALLY_PAID = 'invoice-management.invoice_partially_paid',
  INVOICE_OVERDUE = 'invoice-management.invoice_overdue',
  INVOICE_VOIDED = 'invoice-management.invoice_voided',
  INVOICE_CANCELLED = 'invoice-management.invoice_cancelled',
  INVOICE_REFUNDED = 'invoice-management.invoice_refunded',
}

/** Snapshot of one Billing Engine `BillingItem` at invoice-generation time — copied verbatim, never recalculated. */
export interface IInvoiceLineItem {
  type: string;
  description: string;
  quantity: number | null;
  unitAmount: number | null;
  amount: number;
  resourceKey: string | null;
}

export interface IInvoiceTaxBreakdownEntry {
  label: string;
  ratePercent: number | null;
  amount: number;
}

export interface IInvoice {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  billingPeriodId: string | null;
  subscriptionId: string | null;
  invoiceNumber: string;
  invoiceSequence: number;
  type: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  creditTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  lineItems: IInvoiceLineItem[];
  taxBreakdown: IInvoiceTaxBreakdownEntry[];
  issueDate: Date | null;
  dueDate: Date;
  documentId: string | null;
  deliveryStatus: InvoiceDeliveryStatus;
  deliveredAt: Date | null;
  lastSentAt: Date | null;
  sendAttempts: number;
  downloadCount: number;
  lastDownloadedAt: Date | null;
  paymentReference: Record<string, unknown> | null;
  refundReference: Record<string, unknown> | null;
  creditNoteReference: Record<string, unknown> | null;
  externalReference: Record<string, unknown> | null;
  voidedAt: Date | null;
  voidReason: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  refundedAt: Date | null;
  archivedAt: Date | null;
  idempotencyKey: string | null;
  version: number;
  supersedesInvoiceId: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoiceHistory {
  id: string;
  invoiceId: string;
  workspaceId: string;
  changeType: InvoiceChangeType;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IInvoiceManagementEventPayload {
  event: InvoiceManagementEvent;
  invoiceId: string;
  workspaceId: string;
  invoiceNumber: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
