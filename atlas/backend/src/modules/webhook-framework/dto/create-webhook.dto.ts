import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { WebhookScopeType } from '../interfaces';

export class CreateWebhookDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WebhookScopeType)
  scopeType: WebhookScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  eventTypes: string[];

  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @IsInt()
  @IsOptional()
  @Min(1)
  retryMaxAttempts?: number;

  @IsInt()
  @IsOptional()
  @Min(100)
  retryBackoffMs?: number;
}
