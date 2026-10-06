import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, IsDateString } from 'class-validator';
import { AiHealthCheckType, AiHealthStatus } from '../interfaces';

export class HealthCheckFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiHealthCheckType)
  @IsOptional()
  checkType?: AiHealthCheckType;

  @IsString()
  @IsOptional()
  targetName?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsEnum(AiHealthStatus)
  @IsOptional()
  status?: AiHealthStatus;

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
