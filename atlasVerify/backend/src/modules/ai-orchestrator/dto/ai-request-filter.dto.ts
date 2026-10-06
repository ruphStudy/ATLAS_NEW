import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AiRequestStatus, AiExecutionMode, AiRoutingStrategy } from '../interfaces';

export class AiRequestFilterDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsEnum(AiRequestStatus)
  status?: AiRequestStatus;

  @IsOptional()
  @IsEnum(AiExecutionMode)
  executionMode?: AiExecutionMode;

  @IsOptional()
  @IsEnum(AiRoutingStrategy)
  routingStrategy?: AiRoutingStrategy;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
