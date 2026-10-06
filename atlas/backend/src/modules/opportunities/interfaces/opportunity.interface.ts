// Maps to the OpportunityStatus Prisma enum defined in schema.prisma
export enum OpportunityStatus {
  DISCOVERED = 'DISCOVERED',
  ANALYZING = 'ANALYZING',
  VALIDATED = 'VALIDATED',
  IN_PROGRESS = 'IN_PROGRESS',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export interface IOpportunity {
  id: string;
  workspaceId: string;
  keyword: string;
  /** trim+lowercase(keyword) — used only for manual-Opportunity dedup identity. */
  normalizedKeyword: string | null;
  marketplace: string;
  country: string;
  category: string | null;
  /** Set when this Opportunity was created by promoting a MarketplaceProductCandidate; null for manual/legacy rows. */
  marketplaceProductCandidateId: string | null;
  demandScore: number | null;
  competitionScore: number | null;
  supplierScore: number | null;
  profitScore: number | null;
  aiScore: number | null;
  finalScore: number | null;
  recommendation: string | null;
  status: OpportunityStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Minimal shape of a MarketplaceProductCandidate as read by the Opportunities module. */
export interface IPromotableCandidate {
  id: string;
  marketplaceKey: string;
  country: string;
  externalProductId: string;
  title: string | null;
  marketplaceCategory: string | null;
}

export interface IOpportunityListResult {
  items: IOpportunity[];
  total: number;
  page: number;
  limit: number;
}
