import {
  InvoiceType,
  InvoiceStatus,
  InvoiceDeliveryStatus,
  InvoiceChangeType,
  IInvoiceLineItem,
  IInvoiceTaxBreakdownEntry,
} from '../interfaces';

export class InvoiceResponseDto {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  billingPeriodId: string | null;
  subscriptionId: string | null;
  invoiceNumber: string;
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
  paymentReference: Record<string, unknown> | null;
  refundReference: Record<string, unknown> | null;
  creditNoteReference: Record<string, unknown> | null;
  externalReference: Record<string, unknown> | null;
  voidedAt: Date | null;
  cancelledAt: Date | null;
  refundedAt: Date | null;
  archivedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedInvoiceResponseDto {
  data: InvoiceResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class InvoiceHistoryResponseDto {
  id: string;
  invoiceId: string;
  changeType: InvoiceChangeType;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}
