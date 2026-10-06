import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, IsNotEmpty } from 'class-validator';
import { AiCacheScope, AiCacheStrategy, AiCacheStatus } from '../interfaces';

export class CacheEntryFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiCacheScope)
  @IsOptional()
  scope?: AiCacheScope;

  @IsEnum(AiCacheStrategy)
  @IsOptional()
  strategy?: AiCacheStrategy;

  @IsEnum(AiCacheStatus)
  @IsOptional()
  status?: AiCacheStatus;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsBoolean()
  @IsOptional()
  sensitiveData?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
