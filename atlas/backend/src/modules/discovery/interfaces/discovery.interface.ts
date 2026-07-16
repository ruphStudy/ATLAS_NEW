export enum DiscoverySessionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface IDiscoverySession {
  id: string;
  workspaceId: string;
  marketplace: string;
  country: string;
  categories: string[];
  keywords: string[];
  status: DiscoverySessionStatus;
  totalDiscovered: number;
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
  opportunityId: string | null;
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
  estimatedDemandScore: number;
  estimatedCompetitionScore: number;
  estimatedProfitScore: number;
  estimatedAiScore: number;
  rawData: Record<string, unknown>;
}

export interface IDiscoveryStats {
  totalSessions: number;
  runningSessions: number;
  totalDiscovered: number;
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
