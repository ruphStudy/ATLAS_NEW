import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompetitionProvider } from '../interfaces';

export class CreateCompetitionAnalysisDto {
  @ApiProperty({
    description: 'Opportunity ID to analyze',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  opportunityId!: string;

  @ApiPropertyOptional({
    description: 'Competition provider to use',
    enum: CompetitionProvider,
    default: CompetitionProvider.AMAZON_SEARCH,
  })
  @IsOptional()
  @IsEnum(CompetitionProvider)
  provider?: CompetitionProvider;

  @ApiPropertyOptional({
    description: 'Analysis version (defaults to next version)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
