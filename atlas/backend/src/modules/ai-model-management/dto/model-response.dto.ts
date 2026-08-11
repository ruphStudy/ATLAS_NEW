import { IAiModel, IAiModelConfiguration, IResolvedModel } from '../interfaces';

export type AiModelResponseDto = IAiModel;
export type AiModelConfigurationResponseDto = IAiModelConfiguration;
export type ResolvedModelResponseDto = IResolvedModel;

export interface PaginatedAiModelResponseDto {
  data: AiModelResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedModelConfigurationResponseDto {
  data: AiModelConfigurationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ModelCompatibilityResponseDto {
  compatible: boolean;
  model: AiModelResponseDto;
  capability: string;
  reason?: string;
  missingFeatures?: string[];
}

export interface ModelDiscoveryResponseDto {
  models: AiModelResponseDto[];
  total: number;
  filters: {
    provider?: string;
    capability?: string;
    region?: string;
  };
}
