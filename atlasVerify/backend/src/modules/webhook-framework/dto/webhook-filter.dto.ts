import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEndpointStatus, WebhookHealthStatus, WebhookScopeType } from '../interfaces';
import { WEBHOOK_SORT_FIELDS } from '../constants';

export class WebhookFilterDto {
  @IsEnum(WebhookScopeType)
  @IsOptional()
  scopeType?: WebhookScopeType;

  @IsEnum(WebhookEndpointStatus)
  @IsOptional()
  status?: WebhookEndpointStatus;

  @IsEnum(WebhookHealthStatus)
  @IsOptional()
  healthStatus?: WebhookHealthStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(WEBHOOK_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof WEBHOOK_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
