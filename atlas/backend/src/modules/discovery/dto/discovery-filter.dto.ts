import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { DiscoverySessionStatus } from '../interfaces';

export class DiscoveryFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DiscoverySessionStatus })
  @IsOptional()
  @IsEnum(DiscoverySessionStatus)
  status?: DiscoverySessionStatus;

  @ApiPropertyOptional({ example: 'AMAZON' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  marketplace?: string;
}
