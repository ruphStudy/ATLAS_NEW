import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AiCapability } from '../../../ai/interfaces';

/**
 * ResolveAiProviderInstanceDto
 *
 * Query parameters for requesting a resolved provider instance.
 */
export class ResolveAiProviderInstanceDto {
  @IsEnum(AiCapability)
  capability!: AiCapability;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  modelId?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  preferredProviderKey?: string;
}

/**
 * AiProviderInstanceResolutionResponseDto
 *
 * Safe summary of a resolution outcome — the actual `IAiProvider`
 * instance and any credential material never leave the factory service.
 */
export class AiProviderInstanceResolutionResponseDto {
  providerKey!: string;
  modelId?: string;
  fromCache!: boolean;

  static from(providerKey: string, modelId: string | undefined, fromCache: boolean): AiProviderInstanceResolutionResponseDto {
    const dto = new AiProviderInstanceResolutionResponseDto();
    dto.providerKey = providerKey;
    dto.modelId = modelId;
    dto.fromCache = fromCache;
    return dto;
  }
}
