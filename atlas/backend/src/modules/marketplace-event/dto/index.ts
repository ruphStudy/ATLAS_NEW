import { IsString, IsEnum, IsOptional, IsObject, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MarketplaceEventType,
  EventCategory,
  EventStatus,
  EventSource,
  EventPriority,
} from '../interfaces';

export class SubmitEventRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  accountId!: string;

  @IsString()
  providerKey!: string;

  @IsString()
  marketplaceKey!: string;

  @IsString()
  externalEventId!: string;

  @IsEnum(MarketplaceEventType)
  eventType!: MarketplaceEventType;

  @IsString()
  providerEventType!: string;

  @IsEnum(EventSource)
  source!: EventSource;

  @IsDate()
  @Type(() => Date)
  occurredAt!: Date;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsObject()
  payload!: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class EventFilterQueryDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  providerKey?: string;

  @IsOptional()
  @IsEnum(MarketplaceEventType)
  eventType?: MarketplaceEventType;

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsEnum(EventSource)
  source?: EventSource;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ReprocessEventRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  eventId!: string;
}

export class CancelEventRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  eventId!: string;
}

export class MarketplaceEventResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  externalEventId!: string;
  eventType!: MarketplaceEventType;
  category!: EventCategory;
  source!: EventSource;
  priority!: EventPriority;
  status!: EventStatus;
  version?: number;
  occurredAt!: Date;
  receivedAt!: Date;
  processedAt?: Date;
  attemptCount!: number;
  maxAttempts!: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(event: any): MarketplaceEventResponseDto {
    return {
      id: event.id,
      workspaceId: event.workspaceId,
      accountId: event.accountId,
      providerKey: event.providerKey,
      marketplaceKey: event.marketplaceKey,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      category: event.category,
      source: event.source,
      priority: event.priority,
      status: event.status,
      version: event.version,
      occurredAt: event.occurredAt,
      receivedAt: event.receivedAt,
      processedAt: event.processedAt,
      attemptCount: event.attemptCount,
      maxAttempts: event.maxAttempts,
      errorMessage: event.errorMessage,
      metadata: event.metadata,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}

export class PaginatedMarketplaceEventResponseDto {
  items!: MarketplaceEventResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
