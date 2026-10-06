import {
  AiCacheScope,
  AiCacheStrategy,
  AiCacheStatus,
  IAiCacheEntry,
  IAiCachePolicy,
  IAiCacheInvalidation,
  ICacheSavings,
} from '../interfaces';

export class CacheLookupResponseDto {
  found!: boolean;
  entry?: IAiCacheEntry;
  status?: AiCacheStatus;
  shouldRevalidate!: boolean;
  tokensSaved?: number;
  costSaved?: number;
  latencySavedMs?: number;
}

export class CacheEntryResponseDto implements IAiCacheEntry {
  id!: string;
  workspaceId!: string;
  cacheKey!: string;
  cacheKeyHash!: string;
  scope!: AiCacheScope;
  strategy!: AiCacheStrategy;
  status!: AiCacheStatus;
  capability!: string;
  useCase?: string;
  provider!: string;
  model!: string;
  promptVersion?: string;
  userId?: string;
  workflowId?: string;
  requestId?: string;
  inputHash!: string;
  inputData: unknown;
  contextHash?: string;
  contextData?: unknown;
  parametersHash?: string;
  parameters?: unknown;
  response: unknown;
  responseMetadata?: unknown;
  tokensUsed!: number;
  cost!: number;
  latencyMs!: number;
  hitCount!: number;
  lastHitAt?: Date;
  ttlSeconds!: number;
  expiresAt!: Date;
  staleAt?: Date;
  policyId?: string;
  policySnapshot?: unknown;
  sensitiveData!: boolean;
  bypassable!: boolean;
  invalidationReason?: string;
  invalidatedAt?: Date;
  tags!: string[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedCacheEntryResponseDto {
  data!: CacheEntryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class CachePolicyResponseDto implements IAiCachePolicy {
  id!: string;
  workspaceId!: string;
  name!: string;
  description?: string;
  scope!: AiCacheScope;
  strategy!: AiCacheStrategy;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  enabled!: boolean;
  priority!: number;
  ttlSeconds!: number;
  staleTtlSeconds?: number;
  enableSemanticCache!: boolean;
  semanticThreshold?: number;
  enablePartialCache!: boolean;
  enableStaleRevalidate!: boolean;
  revalidateAsync!: boolean;
  enableWarmup!: boolean;
  warmupSchedule?: string;
  bypassOnError!: boolean;
  bypassOnSensitive!: boolean;
  invalidateOnPromptChange!: boolean;
  invalidateOnModelChange!: boolean;
  invalidateOnProviderChange!: boolean;
  invalidateOnConfigChange!: boolean;
  invalidateOnDataChange!: boolean;
  maxCacheSize?: number;
  evictionStrategy?: string;
  tags!: string[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;
}

export class CacheInvalidationResponseDto implements IAiCacheInvalidation {
  id!: string;
  workspaceId!: string;
  policyId?: string;
  reason!: string;
  triggerType!: string;
  triggerSource?: string;
  scope?: AiCacheScope;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  entriesInvalidated!: number;
  executionTimeMs?: number;
  metadata!: Record<string, unknown>;
  timestamp!: Date;
}

export class CacheSavingsResponseDto implements ICacheSavings {
  totalHits!: number;
  totalMisses!: number;
  hitRate!: number;
  tokensSaved!: number;
  costSaved!: number;
  latencySavedMs!: number;
  averageLatencySavedMs!: number;
}
