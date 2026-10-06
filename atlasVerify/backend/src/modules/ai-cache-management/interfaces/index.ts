export enum AiCacheScope {
  GLOBAL = 'GLOBAL',
  WORKSPACE = 'WORKSPACE',
  USER = 'USER',
  WORKFLOW = 'WORKFLOW',
  REQUEST = 'REQUEST',
}

export enum AiCacheStrategy {
  EXACT_MATCH = 'EXACT_MATCH',
  SEMANTIC = 'SEMANTIC',
  PARTIAL_RESULT = 'PARTIAL_RESULT',
}

export enum AiCacheStatus {
  VALID = 'VALID',
  STALE = 'STALE',
  EXPIRED = 'EXPIRED',
  INVALIDATED = 'INVALIDATED',
  WARMING = 'WARMING',
}

export enum AiCacheEventType {
  HIT = 'HIT',
  MISS = 'MISS',
  STORE = 'STORE',
  EVICT = 'EVICT',
  INVALIDATE = 'INVALIDATE',
  WARM = 'WARM',
  BYPASS = 'BYPASS',
  REVALIDATE = 'REVALIDATE',
}

export interface IAiCacheEntry {
  id: string;
  workspaceId: string;
  cacheKey: string;
  cacheKeyHash: string;
  scope: AiCacheScope;
  strategy: AiCacheStrategy;
  status: AiCacheStatus;
  capability: string;
  useCase?: string;
  provider: string;
  model: string;
  promptVersion?: string;
  userId?: string;
  workflowId?: string;
  requestId?: string;
  inputHash: string;
  inputData: unknown;
  contextHash?: string;
  contextData?: unknown;
  parametersHash?: string;
  parameters?: unknown;
  response: unknown;
  responseMetadata?: unknown;
  tokensUsed: number;
  cost: number;
  latencyMs: number;
  hitCount: number;
  lastHitAt?: Date;
  ttlSeconds: number;
  expiresAt: Date;
  staleAt?: Date;
  policyId?: string;
  policySnapshot?: unknown;
  sensitiveData: boolean;
  bypassable: boolean;
  invalidationReason?: string;
  invalidatedAt?: Date;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiCachePolicy {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  scope: AiCacheScope;
  strategy: AiCacheStrategy;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  enabled: boolean;
  priority: number;
  ttlSeconds: number;
  staleTtlSeconds?: number;
  enableSemanticCache: boolean;
  semanticThreshold?: number;
  enablePartialCache: boolean;
  enableStaleRevalidate: boolean;
  revalidateAsync: boolean;
  enableWarmup: boolean;
  warmupSchedule?: string;
  bypassOnError: boolean;
  bypassOnSensitive: boolean;
  invalidateOnPromptChange: boolean;
  invalidateOnModelChange: boolean;
  invalidateOnProviderChange: boolean;
  invalidateOnConfigChange: boolean;
  invalidateOnDataChange: boolean;
  maxCacheSize?: number;
  evictionStrategy?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IAiCacheMetrics {
  id: string;
  workspaceId: string;
  cacheEntryId?: string;
  policyId?: string;
  eventType: AiCacheEventType;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  scope?: AiCacheScope;
  strategy?: AiCacheStrategy;
  userId?: string;
  workflowId?: string;
  tokensSaved?: number;
  costSaved?: number;
  latencySavedMs?: number;
  requestLatencyMs?: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface IAiCacheInvalidation {
  id: string;
  workspaceId: string;
  policyId?: string;
  reason: string;
  triggerType: string;
  triggerSource?: string;
  scope?: AiCacheScope;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  entriesInvalidated: number;
  executionTimeMs?: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface ICacheKeyComponents {
  workspaceId: string;
  capability: string;
  useCase?: string;
  provider: string;
  model: string;
  promptVersion?: string;
  userId?: string;
  workflowId?: string;
  requestId?: string;
  inputHash: string;
  contextHash?: string;
  parametersHash?: string;
  scope: AiCacheScope;
}

export interface ICacheLookupResult {
  found: boolean;
  entry?: IAiCacheEntry;
  status?: AiCacheStatus;
  shouldRevalidate: boolean;
  tokensSaved?: number;
  costSaved?: number;
  latencySavedMs?: number;
}

export interface ICacheStoreRequest {
  workspaceId: string;
  capability: string;
  useCase?: string;
  provider: string;
  model: string;
  promptVersion?: string;
  userId?: string;
  workflowId?: string;
  requestId?: string;
  inputData: unknown;
  contextData?: unknown;
  parameters?: unknown;
  response: unknown;
  responseMetadata?: unknown;
  tokensUsed: number;
  cost: number;
  latencyMs: number;
  scope?: AiCacheScope;
  strategy?: AiCacheStrategy;
  sensitiveData?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ICacheInvalidateRequest {
  workspaceId: string;
  reason: string;
  triggerType: string;
  triggerSource?: string;
  scope?: AiCacheScope;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
  userId?: string;
  workflowId?: string;
}

export interface ICacheSavings {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  tokensSaved: number;
  costSaved: number;
  latencySavedMs: number;
  averageLatencySavedMs: number;
}

export interface IAiCacheHitEvent {
  event: AiCacheEventType.HIT;
  workspaceId: string;
  cacheEntryId: string;
  tokensSaved: number;
  costSaved: number;
  latencySavedMs: number;
}

export interface IAiCacheMissEvent {
  event: AiCacheEventType.MISS;
  workspaceId: string;
  capability: string;
  provider: string;
  model: string;
}

export interface IAiCacheStoreEvent {
  event: AiCacheEventType.STORE;
  workspaceId: string;
  cacheEntryId: string;
  scope: AiCacheScope;
}

export interface IAiCacheEvictEvent {
  event: AiCacheEventType.EVICT;
  workspaceId: string;
  cacheEntryId: string;
  reason: string;
}

export interface IAiCacheInvalidateEvent {
  event: AiCacheEventType.INVALIDATE;
  workspaceId: string;
  invalidationId: string;
  entriesInvalidated: number;
}

export interface IAiCacheWarmEvent {
  event: AiCacheEventType.WARM;
  workspaceId: string;
  cacheEntryId: string;
}

export interface IAiCacheBypassEvent {
  event: AiCacheEventType.BYPASS;
  workspaceId: string;
  reason: string;
  capability: string;
}

export interface IAiCacheRevalidateEvent {
  event: AiCacheEventType.REVALIDATE;
  workspaceId: string;
  cacheEntryId: string;
}

export type AiCacheEvent =
  | IAiCacheHitEvent
  | IAiCacheMissEvent
  | IAiCacheStoreEvent
  | IAiCacheEvictEvent
  | IAiCacheInvalidateEvent
  | IAiCacheWarmEvent
  | IAiCacheBypassEvent
  | IAiCacheRevalidateEvent;
