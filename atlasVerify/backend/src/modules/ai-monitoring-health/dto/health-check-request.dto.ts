import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { AiHealthCheckType } from '../interfaces';

export class HealthCheckRequestDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(AiHealthCheckType)
  @IsNotEmpty()
  checkType: AiHealthCheckType;

  @IsString()
  @IsOptional()
  targetId?: string;

  @IsString()
  @IsNotEmpty()
  targetName: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @IsBoolean()
  @IsOptional()
  isManual?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
