import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@common/dto/pagination.dto';
import { RfqStatus } from '../interfaces';

export class RfqFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Full-text search on title, rfqNumber' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: RfqStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RfqStatus, { each: true })
  status?: RfqStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  opportunityId?: string;
}
