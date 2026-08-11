import { InvoiceStatus } from '../interfaces';

export const INVOICE_MANAGEMENT_MODULE = 'invoice-management';

export const INVOICE_NUMBER_PREFIX = 'INV';
export const INVOICE_NUMBER_PAD_LENGTH = 6;

/** Roles permitted to manage invoices for a workspace. */
export const INVOICE_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Billing period statuses considered "finalized" enough to generate an invoice from — a DRAFT/PENDING/VOID billing period cannot be invoiced yet. */
export const FINALIZED_BILLING_PERIOD_STATUSES: string[] = ['BILLED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];

export const INVOICE_ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.VOID],
  [InvoiceStatus.ISSUED]: [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.VOID, InvoiceStatus.CANCELLED],
  [InvoiceStatus.PARTIALLY_PAID]: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED],
  [InvoiceStatus.OVERDUE]: [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
  [InvoiceStatus.PAID]: [InvoiceStatus.REFUNDED],
  [InvoiceStatus.VOID]: [],
  [InvoiceStatus.CANCELLED]: [],
  [InvoiceStatus.REFUNDED]: [],
};

/** Statuses still open to a due-date-based OVERDUE check. */
export const DUE_DATE_CHECK_STATUSES: InvoiceStatus[] = [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID];

/** Statuses still worth reconciling against their Billing Engine `BillingPeriod`. */
export const SYNC_CHECK_STATUSES: InvoiceStatus[] = [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE];

export const INVOICE_SORT_FIELDS = ['createdAt', 'dueDate', 'issueDate', 'total'] as const;
