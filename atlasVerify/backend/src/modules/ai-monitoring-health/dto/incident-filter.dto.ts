import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { AiHealthCheckType } from '../interfaces';

export class HealthIncidentFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

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

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  severity?: string;

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
