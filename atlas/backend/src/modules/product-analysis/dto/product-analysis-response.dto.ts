import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalysisStatus } from '../interfaces';

export class ProductAnalysisResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  workspaceId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  opportunityId!: string;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ enum: AnalysisStatus })
  status!: AnalysisStatus;

  @ApiPropertyOptional()
  demandAnalysis?: Record<string, unknown>;

  @ApiPropertyOptional()
  competitionAnalysis?: Record<string, unknown>;

  @ApiPropertyOptional()
  profitCalculation?: Record<string, unknown>;

  @ApiPropertyOptional()
  supplierAnalysis?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 75.5 })
  demandScore?: number;

  @ApiPropertyOptional({ example: 60.0 })
  competitionScore?: number;

  @ApiPropertyOptional({ example: 80.0 })
  profitScore?: number;

  @ApiPropertyOptional({ example: 70.0 })
  supplierScore?: number;

  @ApiPropertyOptional({ example: 71.5 })
  finalScore?: number;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;
}
