import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AnalysisStatus } from '../interfaces';

export class FilterProductAnalysisDto {
  @ApiPropertyOptional({
    description: 'Filter by opportunity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by analysis status',
    enum: AnalysisStatus,
  })
  @IsOptional()
  @IsEnum(AnalysisStatus)
  status?: AnalysisStatus;

  @ApiPropertyOptional({
    description: 'Filter by version number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version?: number;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
