export enum AiModelStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
  BETA = 'BETA',
  PREVIEW = 'PREVIEW',
}

export enum AiModelCapability {
  TEXT_GENERATION = 'TEXT_GENERATION',
  REASONING = 'REASONING',
  VISION = 'VISION',
  IMAGE_GENERATION = 'IMAGE_GENERATION',
  EMBEDDING = 'EMBEDDING',
  VALIDATION = 'VALIDATION',
  STRUCTURED_OUTPUT = 'STRUCTURED_OUTPUT',
  CODE_GENERATION = 'CODE_GENERATION',
  SUMMARIZATION = 'SUMMARIZATION',
  CLASSIFICATION = 'CLASSIFICATION',
}

export enum AiModelModality {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  MULTIMODAL = 'MULTIMODAL',
}

export enum AiModelEvent {
  MODEL_REGISTERED = 'ai-model.registered',
  MODEL_UPDATED = 'ai-model.updated',
  MODEL_ENABLED = 'ai-model.enabled',
  MODEL_DISABLED = 'ai-model.disabled',
  MODEL_DEPRECATED = 'ai-model.deprecated',
  MODEL_ARCHIVED = 'ai-model.archived',
  CONFIGURATION_UPDATED = 'ai-model.configuration_updated',
  CACHE_INVALIDATED = 'ai-model.cache_invalidated',
  COMPATIBILITY_VALIDATED = 'ai-model.compatibility_validated',
  MODEL_RESOLVED = 'ai-model.resolved',
}

export interface IAiModel {
  id: string;
  workspaceId?: string | null;
  provider: string;
  modelKey: string;
  displayName: string;
  version?: string | null;
  status: AiModelStatus;
  capabilities: string[];
  modalities: string[];
  contextLimit?: number | null;
  outputLimit?: number | null;
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  regions: string[];
  pricingInputPer1k?: number | null;
  pricingOutputPer1k?: number | null;
  rateLimit?: number | null;
  rateLimitWindow?: string | null;
  averageLatency?: number | null;
  qualityScore?: number | null;
  availabilityScore?: number | null;
  aliases: string[];
  metadata: Record<string, unknown>;
  isDefault: boolean;
  isPreferred: boolean;
  isFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiModelConfiguration {
  id: string;
  workspaceId: string;
  modelId: string;
  capability: string;
  useCase?: string | null;
  isDefault: boolean;
  isPreferred: boolean;
  priority: number;
  fallbackModelIds: string[];
  maxRetries?: number | null;
  timeout?: number | null;
  temperature?: number | null;
  maxTokens?: number | null;
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IModelResolutionCriteria {
  workspaceId?: string;
  provider?: string;
  capability?: AiModelCapability;
  useCase?: string;
  region?: string;
  maxCost?: number;
  minQualityScore?: number;
  requiresStreaming?: boolean;
  requiresJsonMode?: boolean;
  requiresFunctionCalling?: boolean;
  requiresVision?: boolean;
}

export interface IResolvedModel {
  model: IAiModel;
  configuration?: IAiModelConfiguration;
  fallbacks: IAiModel[];
  reason: string;
}
