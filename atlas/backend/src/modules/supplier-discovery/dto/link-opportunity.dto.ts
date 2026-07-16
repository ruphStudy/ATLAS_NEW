import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkOpportunityDto {
  @ApiPropertyOptional({ example: 1, description: 'Rank / priority of this supplier for the opportunity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rank?: number;

  @ApiPropertyOptional({ example: 'Best pricing for this SKU' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SupplierDiscoveryStatsDto {
  @ApiProperty() totalSessions: number = 0;
  @ApiProperty() runningSessions: number = 0;
  @ApiProperty() totalSuppliers: number = 0;
  @ApiProperty() totalNewSuppliers: number = 0;
  @ApiProperty() totalDuplicatesSkipped: number = 0;
  @ApiProperty({ example: { INDIAMART: 10 } }) byProvider: Record<string, number> = {};
  @ApiProperty({ example: { COMPLETED: 8 } }) byStatus: Record<string, number> = {};
  @ApiProperty({ example: { GOLD: 3 } }) byTier: Record<string, number> = {};
}
