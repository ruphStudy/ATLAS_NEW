import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { OPPORTUNITY_CONSTANTS } from '../constants';
import { OpportunityStatus } from '../interfaces';

export class OpportunityFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: OpportunityStatus })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @ApiPropertyOptional({ example: 'AMAZON_US' })
  @IsOptional()
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.MARKETPLACE_MAX)
  marketplace?: string;

  @ApiPropertyOptional({ example: 'wireless earbuds' })
  @IsOptional()
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.KEYWORD_MAX)
  keyword?: string;

  @ApiPropertyOptional({ example: 50, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  minFinalScore?: number;

  @ApiPropertyOptional({ example: 100, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  maxFinalScore?: number;
}
