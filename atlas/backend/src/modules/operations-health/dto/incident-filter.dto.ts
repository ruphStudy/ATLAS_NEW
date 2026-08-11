import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OperationsHealthIncidentStatus } from '../interfaces';

export class IncidentFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsEnum(OperationsHealthIncidentStatus)
  @IsOptional()
  status?: OperationsHealthIncidentStatus;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
