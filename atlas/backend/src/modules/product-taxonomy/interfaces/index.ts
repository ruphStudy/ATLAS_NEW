// Maps to the TrendSignalSubjectType Prisma enum defined in schema.prisma
export enum TrendSignalSubjectType {
  CATEGORY = 'CATEGORY',
  PRODUCT_CONCEPT = 'PRODUCT_CONCEPT',
}

// Maps to the TrendSignalClassification Prisma enum defined in schema.prisma
export enum TrendSignalClassification {
  RAW_PROVIDER = 'RAW_PROVIDER',
  ATLAS_DERIVED = 'ATLAS_DERIVED',
  AI_EXPLANATION = 'AI_EXPLANATION',
}

export interface ICategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductConcept {
  id: string;
  categoryId: string | null;
  name: string;
  normalizedName: string;
  createdFrom: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrendSignal {
  id: string;
  subjectType: TrendSignalSubjectType;
  subjectId: string;
  signalType: string;
  source: string;
  classification: TrendSignalClassification;
  value: number | null;
  unit: string | null;
  rawPayload: Record<string, unknown> | null;
  explanationText: string | null;
  capturedAt: Date;
  createdAt: Date;
}

/**
 * `signalType` stays a free string on the model (see schema.prisma) so a
 * new provider never needs a migration — these are just the values this
 * codebase currently produces, not an exhaustive/enforced enum.
 */
export const TREND_SIGNAL_TYPES = {
  /** Wikipedia pageview interest — never purchase intent (Prompt 6 data-honesty rule). */
  ATTENTION: 'ATTENTION',
  /** Real keyword search-volume from an ads platform — a genuine demand proxy, distinct from attention. */
  SEARCH_DEMAND: 'SEARCH_DEMAND',
} as const;

// ── Concept discovery (candidate generation — Wikipedia's role) ────────

export interface ITrendConceptCandidate {
  /** Real Wikipedia article title. */
  name: string;
  /** The Wikipedia category (seed or one-level subcategory) this article was found under. */
  categoryName: string;
  categoryParentName: string | null;
}

export interface IAttentionEvidence {
  value: number;
  unit: string;
  capturedAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface IConceptDiscoveryProvider {
  readonly source: string;
  discoverConcepts(
    seedCategories: string[],
    maxLevels: number,
  ): Promise<ITrendConceptCandidate[]>;
  /** Null means "no attention evidence obtainable" — never a fabricated 0/placeholder. */
  getAttentionEvidence(conceptName: string): Promise<IAttentionEvidence | null>;
}

// ── Search-demand validation (Google Keyword Planner's role) ───────────

export interface ISearchDemandEvidence {
  value: number;
  unit: string;
  capturedAt: Date;
  rawPayload: Record<string, unknown>;
}

export interface ISearchDemandProvider {
  readonly source: string;
  /** Whether real credentials/config exist to call this provider at all. */
  isConfigured(): boolean;
  /** Must only be called when isConfigured() is true; returns null if the concept has no measurable demand. */
  getSearchDemandEvidence(conceptName: string): Promise<ISearchDemandEvidence | null>;
}
