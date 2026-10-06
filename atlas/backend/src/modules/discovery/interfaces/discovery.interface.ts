export enum DiscoverySessionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// Maps to the DiscoveryMode Prisma enum defined in schema.prisma. ASIN and
// TREND_COLD_START are schema/DTO slots only — no provider implements them
// yet (see Prompt 4 scope).
export enum DiscoveryMode {
  KEYWORD = 'KEYWORD',
  ASIN = 'ASIN',
  TREND_COLD_START = 'TREND_COLD_START',
}

export interface IDiscoverySession {
  id: string;
  workspaceId: string;
  marketplace: string;
  country: string;
  categories: string[];
  keywords: string[];
  mode: DiscoveryMode;
  seedCategoryId: string | null;
  status: DiscoverySessionStatus;
  totalDiscovered: number;
  /** Legacy name — counts newly discovered MarketplaceProductCandidate rows, not Opportunity rows. */
  newOpportunities: number;
  duplicatesSkipped: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscoveryResult {
  id: string;
  sessionId: string;
  /** Legacy — always null on rows written after Prompt 4; Discovery no longer creates Opportunity. */
  opportunityId: string | null;
  marketplaceProductCandidateId: string | null;
  keyword: string;
  marketplace: string;
  country: string;
  category: string | null;
  isDuplicate: boolean;
  rank: number | null;
  rawData: Record<string, unknown>;
  createdAt: Date;
}

export interface IDiscoveredProduct {
  keyword: string;
  marketplace: string;
  country: string;
  category: string | null;
  title: string;
  rank: number;
  /** The marketplace's own native product ID (e.g. ASIN). Null when the adapter can't resolve a stable ID for this result — no MarketplaceProductCandidate is created in that case. */
  externalProductId: string | null;
  estimatedDemandScore: number;
  estimatedCompetitionScore: number;
  estimatedProfitScore: number;
  estimatedAiScore: number;
  rawData: Record<string, unknown>;
}

export interface IMarketplaceProductCandidate {
  id: string;
  marketplaceKey: string;
  country: string;
  externalProductId: string;
  productConceptId: string | null;
  title: string | null;
  marketplaceCategory: string | null;
  discoveredAt: Date;
  updatedAt: Date;
}

export interface IMarketplaceSnapshot {
  id: string;
  candidateId: string;
  salesRank: number | null;
  price: number | null;
  offerCount: number | null;
  source: string;
  capturedAt: Date;
  createdAt: Date;
}

export interface IDiscoveryStats {
  totalSessions: number;
  runningSessions: number;
  totalDiscovered: number;
  /** Correctly-named field: counts newly discovered MarketplaceProductCandidate rows, not Opportunity rows. Use this, not totalNewOpportunities. */
  totalNewCandidates: number;
  /** @deprecated Legacy name, same value as totalNewCandidates — kept for historical API compatibility only. */
  totalNewOpportunities: number;
  totalDuplicatesSkipped: number;
  byMarketplace: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface IDiscoverySessionListResult {
  items: IDiscoverySession[];
  total: number;
  page: number;
  limit: number;
}

export interface IMarketplaceAdapterDiscoverParams {
  keywords: string[];
  country: string;
  categories?: string[];
  workspaceId: string;
}

export interface IMarketplaceAdapter {
  readonly marketplace: string;
  readonly supportedCountries: readonly string[];
  supportsCountry(country: string): boolean;
  discover(
    params: IMarketplaceAdapterDiscoverParams,
  ): AsyncIterable<IDiscoveredProduct>;
}
