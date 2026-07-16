import { IsOptional, IsEnum, IsObject, IsNumber, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus } from '../interfaces';

export class UpdateProductAnalysisDto {
  @ApiPropertyOptional({
    description: 'Analysis status',
    enum: AnalysisStatus,
  })
  @IsOptional()
  @IsEnum(AnalysisStatus)
  status?: AnalysisStatus;

  @ApiPropertyOptional({
    description: 'Demand analysis results',
  })
  @IsOptional()
  @IsObject()
  demandAnalysis?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Competition analysis results',
  })
  @IsOptional()
  @IsObject()
  competitionAnalysis?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Profit calculation results',
  })
  @IsOptional()
  @IsObject()
  profitCalculation?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Supplier analysis results',
  })
  @IsOptional()
  @IsObject()
  supplierAnalysis?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Demand score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  demandScore?: number;

  @ApiPropertyOptional({
    description: 'Competition score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  competitionScore?: number;

  @ApiPropertyOptional({
    description: 'Profit score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  profitScore?: number;

  @ApiPropertyOptional({
    description: 'Supplier score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  supplierScore?: number;

  @ApiPropertyOptional({
    description: 'Final aggregated score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalScore?: number;

  @ApiPropertyOptional({
    description: 'Error message if analysis failed',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
