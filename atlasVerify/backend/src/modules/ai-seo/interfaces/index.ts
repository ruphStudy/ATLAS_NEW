// =============================================================
// AI SEO Optimizer – Interfaces & Types
// =============================================================

export enum SeoStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  OPTIMIZED = 'OPTIMIZED',
  MANUALLY_EDITED = 'MANUALLY_EDITED',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
}

export enum SeoProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  CUSTOM = 'CUSTOM',
}

export enum SeoSection {
  PRODUCT_TITLE = 'PRODUCT_TITLE',
  BULLET_POINTS = 'BULLET_POINTS',
  DESCRIPTION = 'DESCRIPTION',
  BACKEND_SEARCH_TERMS = 'BACKEND_SEARCH_TERMS',
  SEARCH_KEYWORDS = 'SEARCH_KEYWORDS',
  BRAND_KEYWORDS = 'BRAND_KEYWORDS',
  CATEGORY_KEYWORDS = 'CATEGORY_KEYWORDS',
  LONG_TAIL_KEYWORDS = 'LONG_TAIL_KEYWORDS',
  IMAGE_ALT_TEXT = 'IMAGE_ALT_TEXT',
}

export enum SeoEvent {
  OPTIMIZED = 'seo.optimized',
  APPROVED = 'seo.approved',
}

export enum SearchIntent {
  INFORMATIONAL = 'INFORMATIONAL',
  NAVIGATIONAL = 'NAVIGATIONAL',
  COMMERCIAL = 'COMMERCIAL',
  TRANSACTIONAL = 'TRANSACTIONAL',
}

export interface KeywordDensityResult {
  keyword: string;
  occurrences: number;
  density: number; // percentage
}

export interface ReadabilityResult {
  score: number;           // 0–100
  gradeLevel: string;
  avgSentenceLength: number;
  complexWordRatio: number;
}

export interface DuplicateContentResult {
  isDuplicate: boolean;
  duplicateRatio: number;
  similarSections?: string[];
}

export interface SeoRecommendation {
  section: SeoSection;
  issue: string;
  suggestion: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SeoAnalysis {
  keywordDensity: KeywordDensityResult[];
  readability: ReadabilityResult;
  duplicateContent: DuplicateContentResult;
  searchIntent: SearchIntent;
  seoScore: number; // 0–100
  recommendations: SeoRecommendation[];
}

export interface OptimizedContent {
  productTitle?: string | null;
  bulletPoints?: string[];
  description?: string | null;
  backendSearchTerms?: string[];
  searchKeywords?: string[];
  brandKeywords?: string[];
  categoryKeywords?: string[];
  longTailKeywords?: string[];
  imageAltText?: string[];
}

export interface IAiSeoOptimization {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: SeoStatus;
  version: number;

  // Configuration
  provider: SeoProvider;
  model?: string | null;
  marketplace?: string | null;
  targetKeywords?: string[];
  promptTemplateId?: string | null;

  // Optimized content
  originalContent?: OptimizedContent | null;
  optimizedContent: OptimizedContent;

  // Analysis
  analysis?: SeoAnalysis | null;
  seoScore?: number | null;

  // Usage tracking
  tokensUsed?: number | null;
  optimizationCostUsd?: number | null;

  // Error
  errorMessage?: string | null;
  failedAt?: Date | null;

  // Timing
  optimizationStartedAt?: Date | null;
  optimizationCompletedAt?: Date | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiSeoHistory {
  id: string;
  seoId: string;
  workspaceId: string;
  fromStatus: SeoStatus;
  toStatus: SeoStatus;
  version: number;
  sectionsOptimized?: SeoSection[];
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt: Date;
}

export interface SeoEventPayload {
  seoId: string;
  catalogProductId: string;
  workspaceId: string;
  event: SeoEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface SeoOptimizationJobPayload {
  seoId: string;
  catalogProductId: string;
  workspaceId: string;
  provider: SeoProvider;
  model?: string;
  marketplace?: string;
  targetKeywords?: string[];
  sections: SeoSection[];
  isRegeneration: boolean;
  triggeredBy?: string;
}
