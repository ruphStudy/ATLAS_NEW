import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsNumber, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductScoringDto {
  @ApiProperty({
    description: 'Opportunity ID to score',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  opportunityId!: string;

  @ApiPropertyOptional({ description: 'Score version (defaults to next)', example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version?: number;

  // ── Weight overrides (must each be 0–1; engine normalises to sum=1) ──

  @ApiPropertyOptional({ description: 'Demand weight override (0–1)', example: 0.30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  demandWeight?: number;

  @ApiPropertyOptional({ description: 'Competition weight override (0–1)', example: 0.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  competitionWeight?: number;

  @ApiPropertyOptional({ description: 'Profit weight override (0–1)', example: 0.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  profitWeight?: number;

  @ApiPropertyOptional({ description: 'Supplier weight override (0–1)', example: 0.20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  supplierWeight?: number;
}
