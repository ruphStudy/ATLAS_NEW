import { ArrayMinSize, IsArray, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWebhookDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  eventTypes?: string[];

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
