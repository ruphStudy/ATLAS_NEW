import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookDeliveryStatus } from '../interfaces';
import { WEBHOOK_DELIVERY_SORT_FIELDS } from '../constants';

export class DeliveryFilterDto {
  @IsEnum(WebhookDeliveryStatus)
  @IsOptional()
  status?: WebhookDeliveryStatus;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsIn(WEBHOOK_DELIVERY_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof WEBHOOK_DELIVERY_SORT_FIELDS)[number];

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
