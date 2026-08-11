import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateValidatorConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  validationType?: string;

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
  @IsOptional()
  config?: unknown;

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
