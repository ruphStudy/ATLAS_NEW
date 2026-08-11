import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { AiCacheScope } from '../interfaces';

export class CacheInvalidateDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  triggerType: string;

  @IsString()
  @IsOptional()
  triggerSource?: string;

  @IsEnum(AiCacheScope)
  @IsOptional()
  scope?: AiCacheScope;

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
  promptVersion?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;
}
