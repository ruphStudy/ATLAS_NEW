import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
} from 'class-validator';

export class CreateAgentConfigurationDto {
  @IsString()
  workspaceId: string;

  @IsString()
  agentId: string;

  @IsString()
  useCase: string;

  @IsOptional()
  @IsString()
  overrideInstructions?: string;

  @IsOptional()
  @IsString()
  overrideSystemPrompt?: string;

  @IsOptional()
  @IsString()
  customModelId?: string;

  @IsOptional()
  @IsObject()
  customParameters?: Record<string, unknown>;

  @IsOptional()
  customTools?: unknown;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateAgentConfigurationDto {
  @IsOptional()
  @IsString()
  overrideInstructions?: string;

  @IsOptional()
  @IsString()
  overrideSystemPrompt?: string;

  @IsOptional()
  @IsString()
  customModelId?: string;

  @IsOptional()
  @IsObject()
  customParameters?: Record<string, unknown>;

  @IsOptional()
  customTools?: unknown;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
