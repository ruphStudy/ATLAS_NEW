export enum SupplierStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  BLACKLISTED = 'BLACKLISTED',
}

export enum SupplierTier {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE',
  UNVERIFIED = 'UNVERIFIED',
}

export enum SupplierSourceProvider {
  INDIAMART = 'INDIAMART',
  TRADEINDIA = 'TRADEINDIA',
  ALIBABA = 'ALIBABA',
  MANUAL = 'MANUAL',
}

export enum SupplierDiscoverySessionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface ISupplier {
  id: string;
  workspaceId: string;
  name: string;
  provider: SupplierSourceProvider;
  providerSupplierId: string | null;
  country: string;
  city: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  tier: SupplierTier;
  status: SupplierStatus;
  categories: string[];
  minOrderQuantity: number | null;
  avgLeadTimeDays: number | null;
  overallRating: number | null;
  notes: string | null;
  rawData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IOpportunitySupplierLink {
  id: string;
  opportunityId: string;
  supplierId: string;
  workspaceId: string;
  rank: number;
  notes: string | null;
  createdAt: Date;
}

export interface ISupplierDiscoverySession {
  id: string;
  workspaceId: string;
  provider: SupplierSourceProvider;
  keyword: string;
  country: string;
  category: string | null;
  status: SupplierDiscoverySessionStatus;
  totalDiscovered: number;
  newSuppliers: number;
  duplicatesSkipped: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscoveredSupplier {
  name: string;
  provider: SupplierSourceProvider;
  providerSupplierId: string;
  country: string;
  city: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  categories: string[];
  minOrderQuantity: number | null;
  avgLeadTimeDays: number | null;
  overallRating: number | null;
  rawData: Record<string, unknown>;
}

export interface ISupplierProviderDiscoverParams {
  keyword: string;
  country: string;
  category?: string;
  workspaceId: string;
}

export interface ISupplierProvider {
  readonly provider: SupplierSourceProvider;
  readonly supportedCountries: readonly string[];
  supportsCountry(country: string): boolean;
  discover(params: ISupplierProviderDiscoverParams): AsyncIterable<IDiscoveredSupplier>;
}

export interface ISupplierListResult {
  items: ISupplier[];
  total: number;
  page: number;
  limit: number;
}

export interface ISupplierDiscoverySessionListResult {
  items: ISupplierDiscoverySession[];
  total: number;
  page: number;
  limit: number;
}

export interface ISupplierDiscoveryStats {
  totalSessions: number;
  runningSessions: number;
  totalSuppliers: number;
  totalNewSuppliers: number;
  totalDuplicatesSkipped: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
}
