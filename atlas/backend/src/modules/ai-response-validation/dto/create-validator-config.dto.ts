import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateValidatorConfigDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  validationType!: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsString()
  @IsOptional()
  useCase?: string;

  @IsString()
  @IsOptional()
  agentType?: string;

  @IsString()
  @IsOptional()
  modelProvider?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsNotEmpty()
  config: unknown;

  @IsInt()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsBoolean()
  @IsOptional()
  stopOnFailure?: boolean;

  @IsBoolean()
  @IsOptional()
  attemptRepair?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: unknown;
}
