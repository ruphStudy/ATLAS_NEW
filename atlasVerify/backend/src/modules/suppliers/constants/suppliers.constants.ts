// ── Supplier management statuses (extends discovery statuses) ──

export enum SupplierManagementStatus {
  PROSPECT = 'PROSPECT',
  ACTIVE = 'ACTIVE',
  PREFERRED = 'PREFERRED',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

// ── Matching rule strategy ───────────────────────────────────

export enum DuplicateMatchStrategy {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WEBSITE = 'WEBSITE',
  NAME_COUNTRY = 'NAME_COUNTRY',
  PROVIDER_ID = 'PROVIDER_ID',
}

// ── Event names ──────────────────────────────────────────────

export const SUPPLIER_EVENTS = {
  CREATED: 'supplier.created',
  UPDATED: 'supplier.updated',
  STATUS_CHANGED: 'supplier.status-changed',
  VERIFIED: 'supplier.verified',
} as const;

export type SupplierEventName = (typeof SUPPLIER_EVENTS)[keyof typeof SUPPLIER_EVENTS];

// ── Allowed sort fields ──────────────────────────────────────

export const SUPPLIER_SORT_FIELDS = [
  'name',
  'status',
  'tier',
  'country',
  'performanceScore',
  'riskScore',
  'verificationScore',
  'createdAt',
  'updatedAt',
] as const;

export type SupplierSortField = (typeof SUPPLIER_SORT_FIELDS)[number];
