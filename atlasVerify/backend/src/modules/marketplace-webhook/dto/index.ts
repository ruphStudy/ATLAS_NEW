import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsArray, IsNumber, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEvent, WebhookStatus, WebhookDeliveryStatus } from '../interfaces';

export class RegisterWebhookRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  accountId: string;

  @IsString()
  providerKey: string;

  @IsString()
  marketplaceKey: string;

  @IsUrl()
  callbackUrl: string;

  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events: WebhookEvent[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateWebhookRequestDto {
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEvent, { each: true })
  events?: WebhookEvent[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class WebhookConfigFilterQueryDto {
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
  @IsEnum(WebhookStatus)
  status?: WebhookStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class WebhookDeliveryFilterQueryDto {
  @IsOptional()
  @IsString()
  webhookConfigId?: string;

  @IsOptional()
  @IsEnum(WebhookEvent)
  event?: WebhookEvent;

  @IsOptional()
  @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class IncomingWebhookDto {
  @IsString()
  workspaceId: string;

  @IsString()
  accountId: string;

  @IsString()
  providerKey: string;

  @IsString()
  marketplaceKey: string;

  @IsObject()
  headers: Record<string, string>;

  @IsObject()
  body: any;
}

export class WebhookConfigResponseDto {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalWebhookId?: string;
  callbackUrl: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  isActive: boolean;
  lastDeliveryAt?: Date;
  failureCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  static from(config: any): WebhookConfigResponseDto {
    return {
      id: config.id,
      workspaceId: config.workspaceId,
      accountId: config.accountId,
      providerKey: config.providerKey,
      marketplaceKey: config.marketplaceKey,
      externalWebhookId: config.externalWebhookId,
      callbackUrl: config.callbackUrl,
      events: config.events,
      status: config.status,
      isActive: config.isActive,
      lastDeliveryAt: config.lastDeliveryAt,
      failureCount: config.failureCount,
      metadata: config.metadata,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}

export class PaginatedWebhookConfigResponseDto {
  items: WebhookConfigResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class WebhookDeliveryResponseDto {
  id: string;
  workspaceId: string;
  accountId: string;
  webhookConfigId: string;
  externalEventId: string;
  event: WebhookEvent;
  status: WebhookDeliveryStatus;
  receivedAt: Date;
  processedAt?: Date;
  attemptCount: number;
  errorMessage?: string;
  metadata?: Record<string, any>;

  static from(delivery: any): WebhookDeliveryResponseDto {
    return {
      id: delivery.id,
      workspaceId: delivery.workspaceId,
      accountId: delivery.accountId,
      webhookConfigId: delivery.webhookConfigId,
      externalEventId: delivery.externalEventId,
      event: delivery.event,
      status: delivery.status,
      receivedAt: delivery.receivedAt,
      processedAt: delivery.processedAt,
      attemptCount: delivery.attemptCount,
      errorMessage: delivery.errorMessage,
      metadata: delivery.metadata,
    };
  }
}

export class PaginatedWebhookDeliveryResponseDto {
  items: WebhookDeliveryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class WebhookSecretResponseDto {
  secret: string;
  rotatedAt: Date;
}
