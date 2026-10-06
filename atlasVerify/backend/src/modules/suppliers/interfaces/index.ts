import { SupplierManagementStatus } from '../constants';

// ── Sub-structures ───────────────────────────────────────────

export interface SupplierAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type?: 'REGISTERED' | 'WAREHOUSE' | 'BILLING';
}

export interface SupplierContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface SupplierCertification {
  name: string;
  issuingBody?: string;
  issuedAt?: string;
  expiresAt?: string;
  certificateNumber?: string;
}

export interface SupplierBusinessRegistration {
  registrationNumber?: string;
  registrationAuthority?: string;
  registeredAt?: string;
  legalName?: string;
  legalForm?: string; // e.g. Ltd, Pvt Ltd, LLC
}

export interface SupplierTaxIdentifier {
  type: string; // GST, VAT, EIN, TIN, etc.
  value: string;
  country?: string;
}

export interface SupplierPaymentTerms {
  netDays?: number;
  advancePercentage?: number;
  acceptedMethods?: string[]; // Wire, PayPal, LC, etc.
  currency?: string;
  notes?: string;
}

export interface SupplierShippingTerms {
  incoterms?: string; // FOB, CIF, EXW, etc.
  preferredCarriers?: string[];
  avgTransitDays?: number;
  freeShippingThreshold?: number;
  notes?: string;
}

// ── Core supplier interface ──────────────────────────────────

export interface ISupplierManagement {
  id: string;
  workspaceId: string;

  // Identity
  name: string;
  legalName?: string | null;
  provider: string;
  providerSupplierId?: string | null;
  status: SupplierManagementStatus;
  tier: string;

  // Location
  country: string;
  city?: string | null;
  addresses?: SupplierAddress[] | null;

  // Contact
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactPersons?: SupplierContactPerson[] | null;

  // Business details
  businessRegistration?: SupplierBusinessRegistration | null;
  taxIdentifiers?: SupplierTaxIdentifier[] | null;

  // Operational
  categories: string[];
  minOrderQuantity?: number | null;
  avgLeadTimeDays?: number | null;
  paymentTerms?: SupplierPaymentTerms | null;
  shippingTerms?: SupplierShippingTerms | null;
  certifications?: SupplierCertification[] | null;

  // Scores
  overallRating?: number | null;
  verificationScore?: number | null;
  verificationStatus?: string | null;
  riskScore?: number | null;
  performanceScore?: number | null;

  // Meta
  notes?: string | null;
  rawData?: unknown;
  tags?: string[] | null;

  // Provider identities (multiple providers can reference the same supplier)
  providerIdentities?: ISupplierProviderIdentity[] | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Provider identity ────────────────────────────────────────

export interface ISupplierProviderIdentity {
  id: string;
  supplierId: string;
  workspaceId: string;
  providerCode: string;
  providerSupplierId: string;
  providerUrl?: string | null;
  syncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── History interfaces ───────────────────────────────────────

export interface ISupplierStatusHistory {
  id: string;
  supplierId: string;
  workspaceId: string;
  previousStatus: string | null;
  newStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ISupplierProfileHistory {
  id: string;
  supplierId: string;
  workspaceId: string;
  snapshot: unknown;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Events ───────────────────────────────────────────────────

export interface SupplierCreatedEvent {
  supplierId: string;
  workspaceId: string;
  name: string;
  provider: string;
  createdAt: Date;
}

export interface SupplierUpdatedEvent {
  supplierId: string;
  workspaceId: string;
  updatedAt: Date;
}

export interface SupplierStatusChangedEvent {
  supplierId: string;
  workspaceId: string;
  previousStatus: string | null;
  newStatus: string;
  reason?: string | null;
}

export interface SupplierVerifiedEvent {
  supplierId: string;
  workspaceId: string;
  verificationScore: number;
  verificationStatus: string;
}
