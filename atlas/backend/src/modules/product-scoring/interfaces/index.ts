import { AnalysisStatus } from '@prisma/client';

export { AnalysisStatus };

// ── Enums ────────────────────────────────────────────────────

export enum Recommendation {
  BUY = 'BUY',
  REVIEW = 'REVIEW',
  REJECT = 'REJECT',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

// ── Scoring weights ──────────────────────────────────────────

export interface ScoringWeights {
  demand: number;
  competition: number;
  profit: number;
  supplier: number;
}

// ── Input scores ─────────────────────────────────────────────

export interface ScoreInputs {
  demandScore?: number | null;
  competitionScore?: number | null;
  profitScore?: number | null;
  supplierScore?: number | null;
}

// ── Scoring result ───────────────────────────────────────────

export interface ScoringResult {
  finalScore: number;
  demandScore: number | null;
  competitionScore: number | null;
  profitScore: number | null;
  supplierScore: number | null;
  weights: ScoringWeights;
  recommendation: Recommendation;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  strengths: string[];
  weaknesses: string[];
  riskLevel: RiskLevel;
  inputCount: number;
}

// ── Job payload ──────────────────────────────────────────────

export interface ProductScoringJobPayload {
  scoringId: string;
  opportunityId: string;
  workspaceId: string;
  version: number;
}

// ── Internal record ──────────────────────────────────────────

export interface IProductScore {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  status: AnalysisStatus;
  finalScore?: number | null;
  demandScore?: number | null;
  competitionScore?: number | null;
  profitScore?: number | null;
  supplierScore?: number | null;
  weights?: unknown;
  recommendation?: string | null;
  confidenceLevel?: string | null;
  confidenceScore?: number | null;
  strengths?: unknown;
  weaknesses?: unknown;
  riskLevel?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
