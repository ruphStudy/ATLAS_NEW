import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDate,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CacheScope,
  CacheEntryType,
  InvalidationTrigger,
  ICacheKey,
  ICacheEntry,
  ICacheInvalidation,
  ICacheMetrics,
  ICacheConfig,
} from '../interfaces';

export class CacheKeyDto implements ICacheKey {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(CacheEntryType)
  @IsNotEmpty()
  entryType!: CacheEntryType;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsObject()
  @IsNotEmpty()
  scopes!: Record<CacheScope, string>;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsObject()
  @IsOptional()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsString()
  @IsOptional()
  version?: string;
}

export class SetCacheDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(CacheEntryType)
  @IsNotEmpty()
  entryType!: CacheEntryType;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsObject()
  @IsNotEmpty()
  scopes!: Record<CacheScope, string>;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsObject()
  @IsOptional()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsString()
  @IsOptional()
  version?: string;

  @IsNotEmpty()
  data: any;

  @IsNumber()
  @IsOptional()
  @Min(1)
  ttlSeconds?: number;

  @IsBoolean()
  @IsOptional()
  staleWhileRevalidate?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  staleTimeSeconds?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class GetCacheDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(CacheEntryType)
  @IsNotEmpty()
  entryType!: CacheEntryType;

  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @IsObject()
  @IsNotEmpty()
  scopes!: Record<CacheScope, string>;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsObject()
  @IsOptional()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsString()
  @IsOptional()
  version?: string;

  @IsBoolean()
  @IsOptional()
  allowStale?: boolean;
}

export class InvalidateCacheDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(InvalidationTrigger)
  @IsNotEmpty()
  trigger!: InvalidationTrigger;

  @IsString()
  @IsOptional()
  pattern?: string;

  @IsArray()
  @IsEnum(CacheEntryType, { each: true })
  @IsOptional()
  entryTypes?: CacheEntryType[];

  @IsObject()
  @IsOptional()
  scopes?: Record<CacheScope, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  resourceIds?: string[];

  @IsString()
  @IsOptional()
  triggeredBy?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class WarmCacheDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsArray()
  @IsEnum(CacheEntryType, { each: true })
  @IsNotEmpty()
  entryTypes!: CacheEntryType[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  resourceIds?: string[];

  @IsObject()
  @IsOptional()
  scopes?: Record<CacheScope, string>;

  @IsString()
  @IsOptional()
  triggeredBy?: string;
}

export class CacheMetricsFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(CacheEntryType)
  @IsOptional()
  entryType?: CacheEntryType;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class CacheEntryResponseDto implements ICacheEntry {
  id!: string;
  workspaceId!: string;
  cacheKey!: string;
  entryType!: CacheEntryType;
  resourceId!: string;
  scopes!: Record<CacheScope, string>;
  data: any;
  version!: string;
  ttlSeconds!: number;
  expiresAt!: Date;
  staleAt?: Date;
  hitCount!: number;
  lastAccessedAt?: Date;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CacheInvalidationResponseDto implements ICacheInvalidation {
  id!: string;
  workspaceId!: string;
  trigger!: InvalidationTrigger;
  pattern?: string;
  entryTypes?: CacheEntryType[];
  scopes?: Record<CacheScope, string>;
  resourceIds?: string[];
  invalidatedCount!: number;
  triggeredBy?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
}

export class CacheMetricsResponseDto implements ICacheMetrics {
  id!: string;
  workspaceId!: string;
  entryType?: CacheEntryType;
  periodStart!: Date;
  periodEnd!: Date;
  hitCount!: number;
  missCount!: number;
  staleReadCount!: number;
  refreshCount!: number;
  evictionCount!: number;
  hitRate!: number;
  avgLatencySavedMs?: number;
  estimatedCostSaved?: number;
  metadata?: Record<string, any>;
  createdAt!: Date;
}

export class CacheStatsResponseDto {
  workspaceId!: string;
  totalEntries!: number;
  totalHits!: number;
  totalMisses!: number;
  hitRate!: number;
  entriesByType!: Record<CacheEntryType, number>;
  expiringCount!: number;
  staleCount!: number;
}
