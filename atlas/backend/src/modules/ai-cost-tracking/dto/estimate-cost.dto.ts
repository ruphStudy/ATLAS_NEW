import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class EstimateAiCostDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  providerKey!: string;

  @IsString()
  @IsOptional()
  modelKey?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  inputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  outputTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  cachedTokens?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  imageUnits?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  embeddingUnits?: number;
}
