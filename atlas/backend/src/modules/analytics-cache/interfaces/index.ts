export enum CacheScope {
  WORKSPACE = 'workspace',
  PROVIDER = 'provider',
  MARKETPLACE = 'marketplace',
  ACCOUNT = 'account',
  WAREHOUSE = 'warehouse',
  METRIC = 'metric',
  DIMENSION = 'dimension',
  FILTER = 'filter',
  DATE_RANGE = 'date_range',
}

export enum CacheEntryType {
  ANALYTICS_QUERY = 'analytics_query',
  KPI_RESULT = 'kpi_result',
  DASHBOARD_WIDGET = 'dashboard_widget',
  REPORT_DATASET = 'report_dataset',
  AGGREGATED_MODEL = 'aggregated_model',
}

export enum CacheEventType {
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  CACHE_STALE_READ = 'cache_stale_read',
  CACHE_REFRESH = 'cache_refresh',
  CACHE_EVICTION = 'cache_eviction',
  CACHE_INVALIDATION = 'cache_invalidation',
  CACHE_WARMING_STARTED = 'cache_warming_started',
  CACHE_WARMING_COMPLETED = 'cache_warming_completed',
  BULK_INVALIDATION = 'bulk_invalidation',
}

export enum InvalidationTrigger {
  SOURCE_DATA_CHANGE = 'source_data_change',
  AGGREGATION_CHANGE = 'aggregation_change',
  KPI_CHANGE = 'kpi_change',
  DASHBOARD_CHANGE = 'dashboard_change',
  REPORT_CHANGE = 'report_change',
  CONFIGURATION_CHANGE = 'configuration_change',
  PERMISSION_CHANGE = 'permission_change',
  MANUAL = 'manual',
}

export interface ICacheKey {
  workspaceId: string;
  entryType: CacheEntryType;
  resourceId: string;
  scopes: Record<CacheScope, string>;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  version?: string;
}

export interface ICacheEntry {
  id: string;
  workspaceId: string;
  cacheKey: string;
  entryType: CacheEntryType;
  resourceId: string;
  scopes: Record<CacheScope, string>;
  data: any;
  version: string;
  ttlSeconds: number;
  expiresAt: Date;
  staleAt?: Date;
  hitCount: number;
  lastAccessedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICacheInvalidation {
  id: string;
  workspaceId: string;
  trigger: InvalidationTrigger;
  pattern?: string;
  entryTypes?: CacheEntryType[];
  scopes?: Record<CacheScope, string>;
  resourceIds?: string[];
  invalidatedCount: number;
  triggeredBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ICacheMetrics {
  id: string;
  workspaceId: string;
  entryType?: CacheEntryType;
  periodStart: Date;
  periodEnd: Date;
  hitCount: number;
  missCount: number;
  staleReadCount: number;
  refreshCount: number;
  evictionCount: number;
  hitRate: number;
  avgLatencySavedMs?: number;
  estimatedCostSaved?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ICacheEventPayload {
  event: CacheEventType;
  workspaceId: string;
  cacheKey?: string;
  entryType?: CacheEntryType;
  resourceId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ICacheConfig {
  ttlSeconds: number;
  staleWhileRevalidate?: boolean;
  staleTimeSeconds?: number;
  warmOnCreate?: boolean;
  autoRefresh?: boolean;
  refreshIntervalSeconds?: number;
  versionAware?: boolean;
}
