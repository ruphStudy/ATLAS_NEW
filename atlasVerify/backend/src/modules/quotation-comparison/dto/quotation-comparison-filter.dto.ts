import { PaginationDto } from '@common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ComparisonStatus } from '../interfaces';

export class QuotationComparisonFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiPropertyOptional({ enum: ComparisonStatus, isArray: true })
  @IsOptional()
  @IsEnum(ComparisonStatus, { each: true })
  status?: ComparisonStatus | ComparisonStatus[];
}
