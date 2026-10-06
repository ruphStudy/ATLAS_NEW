import { AnalysisStatus } from '@prisma/client';

export { AnalysisStatus };

export interface DemandAnalysisResult {
  searchVolume?: number;
  trend?: string;
  seasonality?: string;
  score: number;
}

export interface CompetitionAnalysisResult {
  competitorCount?: number;
  averagePrice?: number;
  marketSaturation?: string;
  score: number;
}

export interface ProfitCalculationResult {
  estimatedCost?: number;
  estimatedPrice?: number;
  estimatedMargin?: number;
  score: number;
}

export interface SupplierAnalysisResult {
  availableSuppliers?: number;
  averageRating?: number;
  verifiedCount?: number;
  score: number;
}

export interface AnalysisScores {
  demandScore: number;
  competitionScore: number;
  profitScore: number;
  supplierScore: number;
  finalScore: number;
}

export interface AnalysisJobPayload {
  analysisId: string;
  opportunityId: string;
  workspaceId: string;
  version: number;
}
