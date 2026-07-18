import { AnalysisStatus } from '@prisma/client';

export { AnalysisStatus };

// ── Provider types ───────────────────────────────────────────

export enum CompetitionProvider {
  AMAZON_SEARCH = 'AMAZON_SEARCH',
}

// ── Seller type breakdown ────────────────────────────────────

export interface SellerTypeBreakdown {
  fbaCount: number;
  fbmCount: number;
  amazonCount: number;
  fbaPercentage: number;
  fbmPercentage: number;
  amazonPercentage: number;
}

// ── Rating distribution ──────────────────────────────────────

export interface RatingDistribution {
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  averageRating: number;
  totalRatings: number;
}

// ── Review distribution ──────────────────────────────────────

export interface ReviewDistribution {
  noReviewsCount: number;
  lowReviewsCount: number;    // 1–50
  mediumReviewsCount: number; // 51–500
  highReviewsCount: number;   // 501+
  averageReviewCount: number;
  medianReviewCount: number;
}

// ── Brand dominance ──────────────────────────────────────────

export interface BrandDominance {
  topBrands: Array<{ brand: string; listingCount: number; percentage: number }>;
  topBrandConcentration: number; // % of listings owned by top 3 brands
  isBrandDominated: boolean;
}

// ── Listing quality ──────────────────────────────────────────

export interface ListingQuality {
  avgTitleLength: number;
  avgBulletPoints: number;
  avgImageCount: number;
  aPlusContentPercentage: number;
  videoPercentage: number;
  qualityScore: number; // 0–100
}

// ── Keyword competition ──────────────────────────────────────

export interface KeywordCompetition {
  sponsoredListingCount: number;
  organicListingCount: number;
  sponsoredPercentage: number;
  estimatedCpc?: number;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

// ── Aggregated analysis result ───────────────────────────────

export interface CompetitionAnalysisData {
  competitorCount: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  ratingDistribution: RatingDistribution;
  reviewDistribution: ReviewDistribution;
  brandDominance: BrandDominance;
  sellerTypeBreakdown: SellerTypeBreakdown;
  listingQuality: ListingQuality;
  keywordCompetition: KeywordCompetition;
  competitionScore: number;
  rawData: Record<string, unknown>;
}

// ── Provider interface ───────────────────────────────────────

export interface CompetitionProviderOptions {
  keyword: string;
  marketplace: string;
  country: string;
}

export interface ICompetitionProvider {
  readonly providerName: CompetitionProvider;
  analyze(options: CompetitionProviderOptions): Promise<CompetitionAnalysisData>;
  isAvailable(): boolean;
}

// ── Job payload ──────────────────────────────────────────────

export interface CompetitionAnalysisJobPayload {
  analysisId: string;
  opportunityId: string;
  workspaceId: string;
  version: number;
  provider: CompetitionProvider;
}

// ── Internal record ──────────────────────────────────────────

export interface ICompetitionAnalysis {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  provider: string;
  status: AnalysisStatus;
  competitorCount?: number | null;
  averagePrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  priceRange?: number | null;
  ratingDistribution?: unknown;
  reviewDistribution?: unknown;
  brandDominance?: unknown;
  sellerTypeBreakdown?: unknown;
  listingQuality?: unknown;
  keywordCompetition?: unknown;
  competitionScore?: number | null;
  rawData?: unknown;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
