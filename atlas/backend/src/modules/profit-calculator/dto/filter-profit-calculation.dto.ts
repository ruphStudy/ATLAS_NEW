import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AnalysisStatus, ProfitProvider } from '../interfaces';

export class FilterProfitCalculationDto {
  @ApiPropertyOptional({ description: 'Filter by opportunity ID' })
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiPropertyOptional({ enum: AnalysisStatus })
  @IsOptional()
  @IsEnum(AnalysisStatus)
  status?: AnalysisStatus;

  @ApiPropertyOptional({ enum: ProfitProvider })
  @IsOptional()
  @IsEnum(ProfitProvider)
  provider?: ProfitProvider;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
