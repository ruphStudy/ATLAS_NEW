// =============================================================
// AI Description Generator – Interfaces & Types
// =============================================================

export enum AiDescriptionStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  MANUALLY_EDITED = 'MANUALLY_EDITED',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
}

export enum GenerationTone {
  PROFESSIONAL = 'PROFESSIONAL',
  PREMIUM = 'PREMIUM',
  TECHNICAL = 'TECHNICAL',
  MARKETING = 'MARKETING',
  LUXURY = 'LUXURY',
}

export enum AiProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  CUSTOM = 'CUSTOM',
}

export enum DescriptionSection {
  PRODUCT_TITLE = 'PRODUCT_TITLE',
  SHORT_DESCRIPTION = 'SHORT_DESCRIPTION',
  LONG_DESCRIPTION = 'LONG_DESCRIPTION',
  BULLET_POINTS = 'BULLET_POINTS',
  KEY_FEATURES = 'KEY_FEATURES',
  KEY_BENEFITS = 'KEY_BENEFITS',
  TECHNICAL_SPECIFICATIONS = 'TECHNICAL_SPECIFICATIONS',
  PACKAGE_CONTENTS = 'PACKAGE_CONTENTS',
  USAGE_INSTRUCTIONS = 'USAGE_INSTRUCTIONS',
  CARE_INSTRUCTIONS = 'CARE_INSTRUCTIONS',
  WARRANTY_INFORMATION = 'WARRANTY_INFORMATION',
  FAQS = 'FAQS',
  SEARCH_KEYWORDS = 'SEARCH_KEYWORDS',
  BACKEND_SEARCH_TERMS = 'BACKEND_SEARCH_TERMS',
}

export enum AiDescriptionEvent {
  GENERATED = 'ai-description.generated',
  REGENERATED = 'ai-description.regenerated',
  APPROVED = 'ai-description.approved',
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GeneratedContent {
  productTitle?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  bulletPoints?: string[];
  keyFeatures?: string[];
  keyBenefits?: string[];
  technicalSpecifications?: string | null;
  packageContents?: string | null;
  usageInstructions?: string | null;
  careInstructions?: string | null;
  warrantyInformation?: string | null;
  faqs?: FaqItem[];
  searchKeywords?: string[];
  backendSearchTerms?: string[];
}

export interface SectionGenerationResult {
  section: DescriptionSection;
  content: unknown;
  tokensUsed?: number;
  generatedAt: Date;
}

export interface IAiDescription {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: AiDescriptionStatus;
  version: number;

  // Configuration
  provider: AiProvider;
  model?: string | null;
  tone: GenerationTone;
  language: string;
  promptTemplateId?: string | null;

  // Generated content
  content: GeneratedContent;
  aiQualityScore?: number | null;

  // Token / cost tracking
  tokensUsed?: number | null;
  generationCostUsd?: number | null;

  // Error
  errorMessage?: string | null;
  failedAt?: Date | null;

  // Timing
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiDescriptionHistory {
  id: string;
  descriptionId: string;
  workspaceId: string;
  fromStatus: AiDescriptionStatus;
  toStatus: AiDescriptionStatus;
  version: number;
  sectionsRegenerated?: DescriptionSection[];
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt: Date;
}

export interface AiDescriptionJobPayload {
  descriptionId: string;
  catalogProductId: string;
  workspaceId: string;
  event: AiDescriptionEvent;
  sections?: DescriptionSection[];
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AiGenerationJobPayload {
  descriptionId: string;
  catalogProductId: string;
  workspaceId: string;
  provider: AiProvider;
  model?: string;
  tone: GenerationTone;
  language: string;
  sections: DescriptionSection[];
  isRegeneration: boolean;
  triggeredBy?: string;
}
